import { AppError } from '@src/shared/errors/app-error';

import { TaskStatus } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

interface UpdateTaskDto {
  status?: TaskStatus;
  comments?: string;
  files?: string[];
  links?: string[];
}

const MEMBER_ALLOWED_STATUSES: TaskStatus[] = ['Pendiente', 'En Progreso', 'Entregado'];

export const updateTask = async (
  repo: IActivityRepository,
  activityId: string,
  taskId: string,
  uid: string,
  email: string,
  dto: UpdateTaskDto,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  const isLeader = activity.uid === uid;
  const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) throw new AppError('Task not found', 404, 'NOT_FOUND');

  const task = activity.tasks[taskIndex];

  if (!isLeader) {
    if (task.assignedToEmail !== email) {
      throw new AppError('You can only update your own tasks', 403, 'FORBIDDEN');
    }
    if (dto.status && !MEMBER_ALLOWED_STATUSES.includes(dto.status)) {
      throw new AppError('Members cannot set status to Verificado', 403, 'FORBIDDEN');
    }
  }

  const updatedTask = { ...task, ...dto };
  const updatedTasks = [...activity.tasks];
  updatedTasks[taskIndex] = updatedTask;

  await repo.update(activityId, { tasks: updatedTasks });
};
