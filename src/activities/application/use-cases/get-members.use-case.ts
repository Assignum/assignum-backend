import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export interface MemberInfo {
  email: string;
  fullName: string;
  status: 'accepted' | 'pending';
}

export const getMembers = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<MemberInfo[]> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  const isLeader = activity.uid === uid;
  const isMember = activity.acceptedEmails.includes(email);
  if (!isLeader && !isMember) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const accepted: MemberInfo[] = activity.acceptedEmails.map((e) => ({
    email: e,
    fullName: activity.memberNames[e] ?? '',
    status: 'accepted',
  }));

  const pending: MemberInfo[] = activity.invitedEmails.map((e) => ({
    email: e,
    fullName: activity.memberNames[e] ?? '',
    status: 'pending',
  }));

  return [...accepted, ...pending];
};
