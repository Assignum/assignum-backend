import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { unassignOpenTasks } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

/**
 * Quita a un miembro del grupo. Sus tareas no completadas quedan sin asignar (se devuelven sus
 * ids para que la app ofrezca redistribuirlas); las completadas se quedan a su nombre como
 * historial. Su nombre se conserva en `memberNames` para seguir mostrándolo en esas tareas.
 */
export const removeMember = async (
  repo: IActivityRepository,
  activityId: string,
  leaderUid: string,
  memberEmail: string,
): Promise<{ unassignedTaskIds: string[] }> => {
  const { activityName, unassignedTaskIds } = await repo.mutate(activityId, (activity) => {
    if (activity.uid !== leaderUid) throw new AppError('Only the leader can remove members', 403, 'FORBIDDEN');
    if (!activity.acceptedEmails.includes(memberEmail)) {
      throw new AppError('Member not found', 404, 'NOT_FOUND');
    }
    const { tasks, unassigned } = unassignOpenTasks(activity.tasks, memberEmail);
    return {
      changes: { acceptedEmails: activity.acceptedEmails.filter((e) => e !== memberEmail), tasks },
      result: { activityName: activity.name, unassignedTaskIds: unassigned.map((t) => t.id) },
    };
  });

  await notifyEmail(memberEmail, {
    type: 'member_removed',
    activityId,
    title: 'Saliste de una actividad',
    body: `El líder te quitó del grupo "${activityName}".`,
  });

  return { unassignedTaskIds };
};
