import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';

export const acceptInvitation = async (
  activityRepo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<void> => {
  const activity = await activityRepo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  if (!activity.invitedEmails.includes(email)) {
    throw new AppError('No pending invitation found', 400, 'NOT_INVITED');
  }

  const profile = await userRepo.findByUid(uid);
  const fullName = profile?.fullName || email;

  const updatedInvited = activity.invitedEmails.filter((e) => e !== email);
  const updatedAccepted = [...activity.acceptedEmails, email];
  const updatedNames = { ...activity.memberNames, [email]: fullName };

  await activityRepo.update(activityId, {
    invitedEmails: updatedInvited,
    acceptedEmails: updatedAccepted,
    memberNames: updatedNames,
  });
};
