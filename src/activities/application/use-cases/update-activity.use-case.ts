import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

interface UpdateActivityDto {
  name?: string;
  dueDate?: string;
  documentLink?: string | null;
}

export const updateActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  dto: UpdateActivityDto,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can update this activity', 403, 'FORBIDDEN');

  const updates: UpdateActivityDto = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate;
  if (dto.documentLink !== undefined) updates.documentLink = dto.documentLink;

  await repo.update(activityId, updates);
};
