import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const deleteActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can delete this activity', 403, 'FORBIDDEN');
  await repo.delete(activityId);
};
