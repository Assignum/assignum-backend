import { AppError } from '@src/shared/errors/app-error';

import { ActivityTask } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export type EditTaskDto = Partial<
  Pick<ActivityTask, 'name' | 'taskType' | 'taskComplexity' | 'priority' | 'estimatedHours'>
>;

/**
 * El líder corrige la definición de una tarea (nombre, tipo, complejidad, prioridad, horas).
 * El avance de la tarea (estado, comentarios, archivos) se actualiza con `updateTask`.
 */
export const editTask = async (
  repo: IActivityRepository,
  activityId: string,
  taskId: string,
  uid: string,
  dto: EditTaskDto,
): Promise<void> => {
  await repo.mutate(activityId, (activity) => {
    if (activity.uid !== uid) throw new AppError('Only the leader can edit tasks', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');

    const index = activity.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const tasks = [...activity.tasks];
    tasks[index] = { ...tasks[index], ...dto };
    return { changes: { tasks }, result: undefined };
  });
};
