import { PartialUserProfile, UserProfile } from '../entities/user-profile.entity';

export interface IUserProfileRepository {
  findByUid(uid: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<{ uid: string; email: string } | null>;
  createEmpty(uid: string, email: string): Promise<void>;
  save(uid: string, data: PartialUserProfile & { email?: string }): Promise<void>;
  merge(uid: string, data: PartialUserProfile): Promise<void>;
}
