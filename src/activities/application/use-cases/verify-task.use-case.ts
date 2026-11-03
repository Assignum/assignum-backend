import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const verifyTask = async (
  repo: IActivityRepository,
  activityId: string,
  taskId: string,
  uid: string,
): Promise<void> => {
  await repo.mutate(activityId, (activity) => {
    if (activity.uid !== uid) throw new AppError('Only the leader can verify tasks', 403, 'FORBIDDEN');

    const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const task = activity.tasks[taskIndex];
    if (task.status !== 'Entregado') {
      throw new AppError('Task must be in Entregado status to be verified', 400, 'INVALID_STATUS');
    }

    const tasks = [...activity.tasks];
    tasks[taskIndex] = { ...task, status: 'Verificado' };
    return { changes: { tasks }, result: undefined };
  });
};
