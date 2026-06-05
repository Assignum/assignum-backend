import { AppError } from '@src/shared/errors/app-error';

import { Activity } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const getActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  email: string,
): Promise<Activity> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');

  const isLeader = activity.uid === uid;
  const isMember = activity.acceptedEmails.includes(email);

  if (!isLeader && !isMember) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  if (isLeader) return activity;

  return {
    ...activity,
    tasks: activity.tasks.filter((t) => t.assignedToEmail === email),
  };
};
