import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { ActivityTask, AssignmentMode, groupEmails, isCompleted } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export interface AssignmentInput {
  taskId: string;
  /** `null` deja la tarea sin asignar. */
  assignedToEmail: string | null;
}

interface AppliedChange {
  task: ActivityTask;
  from: string | null;
  to: string | null;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Asigna tareas a estudiantes concretos (asignación manual del líder o confirmación de una
 * redistribución). Las tareas que cambian de responsable vuelven a 'Pendiente' para que el
 * nuevo responsable empiece desde cero; comentarios y archivos se conservan.
 * Las tareas completadas (Entregado/Verificado) no se pueden reasignar.
 */
export const applyAssignments = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  leaderEmail: string,
  assignments: AssignmentInput[],
  /** De dónde salió el reparto: la propuesta de `previewRedistribution` o un cambio manual. */
  mode: AssignmentMode = 'manual',
): Promise<void> => {
  const { activityName, changes } = await repo.mutate(activityId, (activity) => {
    if (activity.uid !== uid) throw new AppError('Only the leader can assign tasks', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');

    const group = new Set(groupEmails(activity, leaderEmail));
    const byId = new Map(assignments.map((a) => [a.taskId, a.assignedToEmail]));
    const applied: AppliedChange[] = [];

    for (const [taskId, email] of byId) {
      const task = activity.tasks.find((t) => t.id === taskId);
      if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
      if (email !== null && !group.has(email)) {
        throw new AppError(`${email} is not a member of this activity`, 400, 'NOT_A_MEMBER');
      }
      if ((task.assignedToEmail ?? null) !== email && isCompleted(task)) {
        throw new AppError(`Task "${task.name}" is already completed and cannot be reassigned`, 400, 'TASK_COMPLETED');
      }
    }

    const tasks = activity.tasks.map((task) => {
      if (!byId.has(task.id)) return task;
      const to = byId.get(task.id) ?? null;
      const from = task.assignedToEmail ?? null;
      if (from === to) return task;
      const updated: ActivityTask = { ...task, assignedToEmail: to, status: 'Pendiente' };
      applied.push({ task: updated, from, to });
      return updated;
    });

    return {
      changes: applied.length
        ? { tasks, assignmentMode: mode, assignmentModeAt: new Date().toISOString() }
        : null,
      result: { activityName: activity.name, changes: applied },
    };
  });

  // Avisos agrupados por persona: a quién se le asignó y a quién se le retiró algo
  const gained = new Map<string, string[]>();
  const lost = new Map<string, string[]>();
  for (const c of changes) {
    if (c.to && c.to !== leaderEmail) gained.set(c.to, [...(gained.get(c.to) ?? []), c.task.name]);
    if (c.from && c.from !== leaderEmail) lost.set(c.from, [...(lost.get(c.from) ?? []), c.task.name]);
  }

  await Promise.all([
    ...[...gained].map(([email, names]) =>
      notifyEmail(email, {
        type: 'task_assigned',
        activityId,
        title: plural(names.length, 'Nueva tarea asignada', 'Nuevas tareas asignadas'),
        body: `En "${activityName}": ${names.join(', ')}`,
      }),
    ),
    ...[...lost].map(([email, names]) =>
      notifyEmail(email, {
        type: 'task_unassigned',
        activityId,
        title: plural(names.length, 'Se reasignó una de tus tareas', 'Se reasignaron algunas de tus tareas'),
        body: `En "${activityName}": ${names.join(', ')}`,
      }),
    ),
  ]);
};
