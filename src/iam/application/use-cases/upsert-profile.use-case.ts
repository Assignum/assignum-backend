import { PartialUserProfile } from '../../domain/entities/user-profile.entity';
import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

export const createProfile = async (
  profileRepo: IUserProfileRepository,
  uid: string,
  data: PartialUserProfile,
): Promise<void> => {
  await profileRepo.save(uid, data);
};

export const updateProfile = async (
  profileRepo: IUserProfileRepository,
  uid: string,
  data: PartialUserProfile,
): Promise<void> => {
  await profileRepo.merge(uid, data);
};
