import { AppError } from '@src/shared/errors/app-error';
import { notifyUid } from '@src/shared/infrastructure/notifications/notify.service';

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
  // Transacción: varios miembros pueden actualizar tareas del mismo arreglo a la vez
  const delivered = await repo.mutate(activityId, (activity) => {
    const isLeader = activity.uid === uid;
    const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const task = activity.tasks[taskIndex];

    if (!isLeader) {
      if (task.assignedToEmail !== email) {
        throw new AppError('You can only update your own tasks', 403, 'FORBIDDEN');
      }
      if (task.status === 'Verificado') {
        throw new AppError('Task is already verified', 403, 'FORBIDDEN');
      }
      if (dto.status && !MEMBER_ALLOWED_STATUSES.includes(dto.status)) {
        throw new AppError('Members cannot set status to Verificado', 403, 'FORBIDDEN');
      }
    }

    const tasks = [...activity.tasks];
    tasks[taskIndex] = { ...task, ...dto };

    const justDelivered = !isLeader && dto.status === 'Entregado' && task.status !== 'Entregado';
    return {
      changes: { tasks },
      result: justDelivered
        ? { leaderUid: activity.uid, activityName: activity.name, taskName: task.name, who: activity.memberNames[email] || email }
        : null,
    };
  });

  if (delivered) {
    await notifyUid(delivered.leaderUid, {
      type: 'task_delivered',
      activityId,
      title: 'Tarea entregada',
      body: `${delivered.who} entregó "${delivered.taskName}" en "${delivered.activityName}". Revísala para verificarla.`,
    });
  }
};
