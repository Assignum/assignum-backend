import { AppError } from '@src/shared/errors/app-error';
import { notifyUid } from '@src/shared/infrastructure/notifications/notify.service';

import { unassignOpenTasks } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

/**
 * Un miembro sale de la actividad por su cuenta. Igual que al quitarlo el líder: sus tareas
 * sin terminar quedan sin asignar y las completadas se conservan a su nombre.
 */
export const leaveActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<void> => {
  const { leaderUid, activityName, who, unassignedCount } = await repo.mutate(activityId, (activity) => {
    if (activity.uid === uid) {
      throw new AppError('The leader cannot leave the activity; transfer the leadership first', 400, 'LEADER_CANNOT_LEAVE');
    }
    if (!activity.acceptedEmails.includes(email)) throw new AppError('You are not a member of this activity', 404, 'NOT_A_MEMBER');

    const { tasks, unassigned } = unassignOpenTasks(activity.tasks, email);
    return {
      changes: { acceptedEmails: activity.acceptedEmails.filter((e) => e !== email), tasks },
      result: {
        leaderUid: activity.uid,
        activityName: activity.name,
        who: activity.memberNames[email] || email,
        unassignedCount: unassigned.length,
      },
    };
  });

  const tasksNote = unassignedCount
    ? ` ${unassignedCount} ${unassignedCount === 1 ? 'tarea quedó' : 'tareas quedaron'} sin asignar; redistribúyelas desde la actividad.`
    : '';
  await notifyUid(leaderUid, {
    type: 'member_left',
    activityId,
    title: 'Un miembro salió de la actividad',
    body: `${who} salió de "${activityName}".${tasksNote}`,
  });
};
