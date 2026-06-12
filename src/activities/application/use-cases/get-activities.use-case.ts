import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';

import { ActivityResponse } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const getActivities = async (
  repo: IActivityRepository,
  userRepo: IUserProfileRepository,
  uid: string,
  email: string,
): Promise<ActivityResponse[]> => {
  const activities = await repo.findByUserContext(uid, email);

  // Batch-fetch all unique leader profiles to avoid N sequential reads
  const uniqueLeaderUids = [...new Set(activities.map((a) => a.uid))];
  const leaderProfiles = await Promise.all(
    uniqueLeaderUids.map((leaderUid) => userRepo.findByUid(leaderUid)),
  );
  const leaderNameMap: Record<string, string> = {};
  uniqueLeaderUids.forEach((leaderUid, i) => {
    const profile = leaderProfiles[i];
    leaderNameMap[leaderUid] = profile?.fullName || profile?.email || leaderUid;
  });

  return activities.map((activity) => ({
    ...activity,
    leaderName: leaderNameMap[activity.uid] ?? activity.uid,
  }));
};
