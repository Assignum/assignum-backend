import { v4 as uuidv4 } from 'uuid';

import { AppError } from '@src/shared/errors/app-error';

import { ActivityTask } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const addTasks = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  taskNames: string[],
): Promise<ActivityTask[]> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can add tasks', 403, 'FORBIDDEN');

  const newTasks: ActivityTask[] = taskNames.map((name) => ({
    id: uuidv4(),
    name,
    assignedToEmail: null,
    status: 'Pendiente',
    comments: '',
    files: [],
    links: [],
  }));

  const updatedTasks = [...activity.tasks, ...newTasks];
  await repo.update(activityId, { tasks: updatedTasks });
  return newTasks;
};
