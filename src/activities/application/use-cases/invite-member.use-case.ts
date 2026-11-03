import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const inviteMember = async (
  activityRepo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  leaderUid: string,
  rawEmail: string,
): Promise<void> => {
  const inviteEmail = rawEmail.trim().toLowerCase();

  const user = await userRepo.findByEmail(inviteEmail);
  if (!user) throw new AppError('User with that email does not exist', 404, 'USER_NOT_FOUND');
  if (user.uid === leaderUid) throw new AppError('You cannot invite yourself', 400, 'SELF_INVITE');

  const activityName = await activityRepo.mutate(activityId, (activity) => {
    if (activity.uid !== leaderUid) throw new AppError('Only the leader can invite members', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');
    if (activity.invitedEmails.includes(inviteEmail) || activity.acceptedEmails.includes(inviteEmail)) {
      throw new AppError('User is already invited or a member', 400, 'ALREADY_INVITED');
    }
    return { changes: { invitedEmails: [...activity.invitedEmails, inviteEmail] }, result: activity.name };
  });

  await sendInvitationPush(userRepo, activityId, activityName, leaderUid, inviteEmail);
};

/** Push de invitación. No se guarda en la bandeja: la invitación ya aparece como tarjeta. */
export const sendInvitationPush = async (
  userRepo: IUserProfileRepository,
  activityId: string,
  activityName: string,
  leaderUid: string,
  email: string,
): Promise<void> => {
  const leaderProfile = await userRepo.findByUid(leaderUid);
  const leaderName = leaderProfile?.fullName || 'Tu líder';
  await notifyEmail(
    email,
    {
      type: 'invitation',
      activityId,
      title: '¡Nueva invitación!',
      body: `${leaderName} te invitó a "${activityName}"`,
    },
    { persist: false },
  );
};
