import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const deleteTask = async (
  repo: IActivityRepository,
  activityId: string,
  taskId: string,
  uid: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can delete tasks', 403, 'FORBIDDEN');

  const taskExists = activity.tasks.some((t) => t.id === taskId);
  if (!taskExists) throw new AppError('Task not found', 404, 'NOT_FOUND');

  const updatedTasks = activity.tasks.filter((t) => t.id !== taskId);
  await repo.update(activityId, { tasks: updatedTasks });
};
