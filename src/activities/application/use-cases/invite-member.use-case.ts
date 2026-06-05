import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';

export const inviteMember = async (
  activityRepo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  leaderUid: string,
  inviteEmail: string,
): Promise<void> => {
  const activity = await activityRepo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== leaderUid) throw new AppError('Only the leader can invite members', 403, 'FORBIDDEN');

  const user = await userRepo.findByEmail(inviteEmail);
  if (!user) throw new AppError('User with that email does not exist', 404, 'USER_NOT_FOUND');

  if (activity.invitedEmails.includes(inviteEmail) || activity.acceptedEmails.includes(inviteEmail)) {
    throw new AppError('User is already invited or a member', 400, 'ALREADY_INVITED');
  }

  await activityRepo.update(activityId, {
    invitedEmails: [...activity.invitedEmails, inviteEmail],
  });
};
