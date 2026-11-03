import { AppError } from '@src/shared/errors/app-error';
import { notifyUid } from '@src/shared/infrastructure/notifications/notify.service';

import { unassignOpenTasks } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const declineInvitation = async (
  repo: IActivityRepository,
  activityId: string,
  email: string,
): Promise<void> => {
  const { leaderUid, activityName, unassignedCount } = await repo.mutate(activityId, (activity) => {
    if (!activity.invitedEmails.includes(email)) {
      throw new AppError('No pending invitation found', 400, 'NOT_INVITED');
    }
    // Si ya se le habían repartido tareas, quedan sin asignar para que el líder las redistribuya
    const { tasks, unassigned } = unassignOpenTasks(activity.tasks, email);
    return {
      changes: { invitedEmails: activity.invitedEmails.filter((e) => e !== email), tasks },
      result: { leaderUid: activity.uid, activityName: activity.name, unassignedCount: unassigned.length },
    };
  });

  const tasksNote = unassignedCount
    ? ` ${unassignedCount} ${unassignedCount === 1 ? 'tarea quedó' : 'tareas quedaron'} sin asignar; redistribúyelas desde la actividad.`
    : '';
  await notifyUid(leaderUid, {
    type: 'invitation_declined',
    activityId,
    title: 'Invitación rechazada',
    body: `${email} rechazó la invitación a "${activityName}".${tasksNote}`,
  });
};
