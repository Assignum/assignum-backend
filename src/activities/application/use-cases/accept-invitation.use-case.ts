import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';
import { notifyUid } from '@src/shared/infrastructure/notifications/notify.service';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const acceptInvitation = async (
  activityRepo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<void> => {
  const profile = await userRepo.findByUid(uid);
  const fullName = profile?.fullName || email;

  const activity = await activityRepo.mutate(activityId, (current) => {
    if (!current.invitedEmails.includes(email)) {
      throw new AppError('No pending invitation found', 400, 'NOT_INVITED');
    }
    return {
      changes: {
        invitedEmails: current.invitedEmails.filter((e) => e !== email),
        acceptedEmails: [...current.acceptedEmails, email],
        memberNames: { ...current.memberNames, [email]: fullName },
      },
      result: current,
    };
  });

  await notifyUid(activity.uid, {
    type: 'invitation_accepted',
    activityId,
    title: 'Invitación aceptada',
    body: `${fullName} se unió a "${activity.name}".`,
  });
};
