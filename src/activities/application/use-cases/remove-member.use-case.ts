import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const removeMember = async (
  repo: IActivityRepository,
  activityId: string,
  leaderUid: string,
  memberEmail: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== leaderUid) throw new AppError('Only the leader can remove members', 403, 'FORBIDDEN');

  if (!activity.acceptedEmails.includes(memberEmail)) {
    throw new AppError('Member not found', 404, 'NOT_FOUND');
  }

  const updatedAccepted = activity.acceptedEmails.filter((e) => e !== memberEmail);
  const updatedNames = { ...activity.memberNames };
  delete updatedNames[memberEmail];

  await repo.update(activityId, {
    acceptedEmails: updatedAccepted,
    memberNames: updatedNames,
  });
};
