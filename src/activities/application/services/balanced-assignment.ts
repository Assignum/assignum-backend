import { UserProfile } from '@src/iam/domain/entities/user-profile.entity';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { getRanking } from '@src/shared/infrastructure/ml/ml-recommend.service';

import { ActivityTask, AssignmentMode } from '../../domain/entities/activity.entity';

export interface ProposedAssignment {
  taskId: string;
  assignedToEmail: string;
}

export interface BalancedProposal {
  assignments: ProposedAssignment[];
  /** 'fallback' si para alguna tarea el ML no respondió y se usó solo la menor carga. */
  mode: Extract<AssignmentMode, 'ml' | 'fallback'>;
}

/**
 * Reparte `tasks` entre `candidates` equilibrando horas estimadas.
 *
 * - `baseHours` es la carga que cada candidato ya tiene (incluye tareas completadas),
 *   así quien ya trabajó más no recibe más solo por haber terminado antes.
 * - Se reparten primero las tareas más largas. Para cada una se recorre el ranking del
 *   servicio ML y se elige al mejor candidato que no se pase de la carga objetivo
 *   (promedio del grupo); si nadie cabe, se elige al de menor carga.
 * - Si el servicio ML falla, se usa solo el criterio de menor carga.
 */
export const proposeBalancedAssignments = async (
  tasks: ActivityTask[],
  candidates: string[],
  baseHours: Map<string, number>,
  profiles: Array<{ email: string; profile: UserProfile | null }>,
): Promise<BalancedProposal> => {
  const load = new Map(candidates.map((e) => [e, baseHours.get(e) ?? 0]));
  const hoursOf = (t: ActivityTask) => t.estimatedHours || 1;
  const totalHours = [...load.values()].reduce((a, b) => a + b, 0) + tasks.reduce((a, t) => a + hoursOf(t), 0);
  const target = totalHours / candidates.length;
  const candidateSet = new Set(candidates);
  const candidateProfiles = profiles.filter((p) => candidateSet.has(p.email));

  const byLoad = () => [...candidates].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));

  const sorted = [...tasks].sort((a, b) => hoursOf(b) - hoursOf(a));
  const proposals: ProposedAssignment[] = [];
  let usedFallback = false;

  for (const task of sorted) {
    const hours = hoursOf(task);
    let order: string[];
    try {
      const ranking = await getRanking(task, candidateProfiles);
      order = ranking.map((r) => r.name).filter((name) => candidateSet.has(name));
      // Por si el ML omite a alguien, se agregan al final por menor carga
      for (const e of byLoad()) if (!order.includes(e)) order.push(e);
    } catch {
      order = byLoad();
      usedFallback = true;
    }

    // "Cabe" si al menos la mitad de la tarea queda por debajo del objetivo
    const chosen = order.find((e) => (load.get(e) ?? 0) + hours / 2 <= target) ?? byLoad()[0];
    load.set(chosen, (load.get(chosen) ?? 0) + hours);
    proposals.push({ taskId: task.id, assignedToEmail: chosen });
  }

  // Devolver en el orden original de las tareas
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  return {
    assignments: proposals.sort((a, b) => (order.get(a.taskId) ?? 0) - (order.get(b.taskId) ?? 0)),
    mode: usedFallback ? 'fallback' : 'ml',
  };
};

export const fetchMemberProfiles = async (
  profileRepo: IUserProfileRepository,
  emails: string[],
): Promise<Array<{ email: string; profile: UserProfile | null }>> =>
  Promise.all(
    emails.map(async (email) => {
      const record = await profileRepo.findByEmail(email);
      const profile = record ? await profileRepo.findByUid(record.uid) : null;
      return { email, profile };
    }),
  );
