import { Activity } from '../entities/activity.entity';

export interface IActivityRepository {
  findById(id: string): Promise<Activity | null>;
  findByUserContext(uid: string, email: string): Promise<Activity[]>;
  findByInvitedEmail(email: string): Promise<Activity[]>;
  create(activity: Activity): Promise<void>;
  update(id: string, data: Partial<Activity>): Promise<void>;
  delete(id: string): Promise<void>;
}
