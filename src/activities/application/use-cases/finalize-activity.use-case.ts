import { AppError } from '@src/shared/errors/app-error';

import { computeProgress } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const finalizeActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can finalize this activity', 403, 'FORBIDDEN');

  const progress = computeProgress(activity.tasks);
  if (progress < 100) {
    throw new AppError(`Cannot finalize: progress is ${progress.toFixed(0)}%. All tasks must be Verificado.`, 400, 'PROGRESS_INCOMPLETE');
  }

  await repo.update(activityId, { finalized: true });
};
