import { getRanking } from '@src/shared/infrastructure/ml/ml-recommend.service';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

import { AssignmentMode, isCompleted } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';
import { fetchMemberProfiles } from '../services/balanced-assignment';

/**
 * Reparto inicial ("Dividir tareas"). Para repartir de nuevo tareas concretas entre
 * estudiantes concretos se usa `previewRedistribution` + `applyAssignments`.
 */
export const assignTasks = async (
  repo: IActivityRepository,
  profileRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  leaderEmail: string,
): Promise<Extract<AssignmentMode, 'ml' | 'fallback'>> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can assign tasks', 403, 'FORBIDDEN');
  if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');
  if (activity.tasks.length === 0) throw new AppError('No tasks to assign', 400, 'NO_TASKS');

  const allEmails = [leaderEmail, ...activity.acceptedEmails, ...activity.invitedEmails];
  const protectedSet = new Set([leaderEmail, ...activity.acceptedEmails]);

  const memberProfiles = await fetchMemberProfiles(profileRepo, allEmails);

  // Cupo justo por persona: cada uno recibe como máximo ceil(tareas / miembros)
  const unprotectedTasks = activity.tasks.filter(
    (t) => !(t.assignedToEmail && protectedSet.has(t.assignedToEmail)),
  );
  const quota = Math.ceil(unprotectedTasks.length / allEmails.length);
  const assignedCount = new Map<string, number>(allEmails.map((e) => [e, 0]));

  // Fallback round-robin index
  let fallbackIndex = 0;
  let usedFallback = false;

  const proposals = new Map<string, string>();

  for (const task of unprotectedTasks) {
    try {
      const ranking = await getRanking(task, memberProfiles);

      // Recorrer el ranking hasta encontrar alguien con cupo disponible
      let assigned: string | null = null;
      for (const entry of ranking) {
        const count = assignedCount.get(entry.name) ?? 0;
        if (count < quota) {
          assigned = entry.name;
          assignedCount.set(entry.name, count + 1);
          break;
        }
      }

      // Si todos están al límite (tareas no divisibles exactamente), asignar al primero del ranking
      if (!assigned) {
        assigned = ranking[0].name;
        assignedCount.set(assigned, (assignedCount.get(assigned) ?? 0) + 1);
      }

      proposals.set(task.id, assigned);
    } catch {
      // Fallback a round-robin si el ML no responde
      proposals.set(task.id, allEmails[fallbackIndex % allEmails.length]);
      fallbackIndex++;
      usedFallback = true;
    }
  }

  // Las llamadas al ML tardan: se aplica en una transacción sobre la versión actual del
  // documento para no pisar cambios hechos mientras tanto.
  await repo.mutate(activityId, (current) => ({
    changes: {
      tasks: current.tasks.map((t) => {
        const email = proposals.get(t.id);
        return email && !isCompleted(t) ? { ...t, assignedToEmail: email } : t;
      }),
      // Queda registrado para que la app avise al líder que el reparto se hizo sin ML
      assignmentMode: usedFallback ? 'fallback' : 'ml',
      assignmentModeAt: new Date().toISOString(),
    },
    result: undefined,
  }));

  return usedFallback ? 'fallback' : 'ml';
};
