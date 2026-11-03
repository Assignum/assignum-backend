import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';
import { sendInvitationPush } from './invite-member.use-case';

export const resendInvitation = async (
  activityRepo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  leaderUid: string,
  email: string,
): Promise<void> => {
  const activity = await activityRepo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== leaderUid) throw new AppError('Only the leader can resend invitations', 403, 'FORBIDDEN');
  if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');
  if (!activity.invitedEmails.includes(email)) {
    throw new AppError('No pending invitation found', 404, 'NOT_INVITED');
  }

  await sendInvitationPush(userRepo, activityId, activity.name, leaderUid, email);
};
