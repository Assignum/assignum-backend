import { Activity } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const getActivities = async (
  repo: IActivityRepository,
  uid: string,
  email: string,
): Promise<Activity[]> => {
  return repo.findByUserContext(uid, email);
};
