import { v4 as uuidv4 } from 'uuid';

import { AppError } from '@src/shared/errors/app-error';

import { ActivityTask } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

type TaskInput = Pick<ActivityTask, 'name' | 'taskType' | 'taskComplexity' | 'priority' | 'estimatedHours'>;

export const addTasks = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  taskInputs: TaskInput[],
): Promise<ActivityTask[]> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can add tasks', 403, 'FORBIDDEN');

  const newTasks: ActivityTask[] = taskInputs.map((input) => ({
    id: uuidv4(),
    name: input.name,
    assignedToEmail: null,
    status: 'Pendiente',
    comments: '',
    files: [],
    links: [],
    taskType: input.taskType,
    taskComplexity: input.taskComplexity,
    priority: input.priority,
    estimatedHours: input.estimatedHours,
  }));

  const updatedTasks = [...activity.tasks, ...newTasks];
  await repo.update(activityId, { tasks: updatedTasks });
  return newTasks;
};
