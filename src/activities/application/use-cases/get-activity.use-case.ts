import { AppError } from '@src/shared/errors/app-error';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';

import { ActivityResponse } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const getActivity = async (
  repo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<ActivityResponse> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  const isLeader = activity.uid === uid;
  const isMember = activity.acceptedEmails.includes(email);
  const isInvited = activity.invitedEmails.includes(email);

  if (!isLeader && !isMember && !isInvited) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  // Fetch leader name from Firestore
  const leaderProfile = await userRepo.findByUid(activity.uid);
  const leaderName = leaderProfile?.fullName || leaderProfile?.email || activity.uid;

  // Resolve fresh names for all accepted members (fixes stale/empty memberNames)
  const freshNames: Record<string, string> = { ...activity.memberNames };
  await Promise.all(
    activity.acceptedEmails.map(async (memberEmail) => {
      if (!freshNames[memberEmail]) {
        const memberUser = await userRepo.findByEmail(memberEmail);
        if (memberUser) {
          const memberProfile = await userRepo.findByUid(memberUser.uid);
          freshNames[memberEmail] = memberProfile?.fullName || memberEmail;
        }
      }
    }),
  );

  const base: ActivityResponse = {
    ...activity,
    leaderName,
    memberNames: freshNames,
  };

  if (isLeader) return base;

  // Accepted members and pre-assigned invited members see only their tasks
  return {
    ...base,
    tasks: activity.tasks.filter((t) => t.assignedToEmail === email),
  };
};
