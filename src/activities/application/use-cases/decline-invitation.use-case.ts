import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const declineInvitation = async (
  repo: IActivityRepository,
  activityId: string,
  email: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  if (!activity.invitedEmails.includes(email)) {
    throw new AppError('No pending invitation found', 400, 'NOT_INVITED');
  }

  await repo.update(activityId, {
    invitedEmails: activity.invitedEmails.filter((e) => e !== email),
  });
};
