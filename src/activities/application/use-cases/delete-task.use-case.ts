import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const deleteTask = async (
  repo: IActivityRepository,
  activityId: string,
  taskId: string,
  uid: string,
): Promise<void> => {
  await repo.mutate(activityId, (activity) => {
    if (activity.uid !== uid) throw new AppError('Only the leader can delete tasks', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');
    if (!activity.tasks.some((t) => t.id === taskId)) throw new AppError('Task not found', 404, 'NOT_FOUND');
    return { changes: { tasks: activity.tasks.filter((t) => t.id !== taskId) }, result: undefined };
  });
};
