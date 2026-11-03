import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { unassignOpenTasks } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

/** Retira una invitación pendiente. Las tareas que tenía asignadas quedan sin asignar. */
export const cancelInvitation = async (
  repo: IActivityRepository,
  activityId: string,
  leaderUid: string,
  email: string,
): Promise<{ unassignedTaskIds: string[] }> => {
  const { activityName, unassignedTaskIds } = await repo.mutate(activityId, (activity) => {
    if (activity.uid !== leaderUid) throw new AppError('Only the leader can cancel invitations', 403, 'FORBIDDEN');
    if (!activity.invitedEmails.includes(email)) {
      throw new AppError('No pending invitation found', 404, 'NOT_INVITED');
    }
    const { tasks, unassigned } = unassignOpenTasks(activity.tasks, email);
    return {
      changes: { invitedEmails: activity.invitedEmails.filter((e) => e !== email), tasks },
      result: { activityName: activity.name, unassignedTaskIds: unassigned.map((t) => t.id) },
    };
  });

  await notifyEmail(email, {
    type: 'invitation_cancelled',
    activityId,
    title: 'Invitación cancelada',
    body: `Tu invitación a "${activityName}" fue cancelada por el líder.`,
  });

  return { unassignedTaskIds };
};
