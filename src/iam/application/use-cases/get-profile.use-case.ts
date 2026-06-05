import { AppError } from '@src/shared/errors/app-error';

import { UserProfile } from '../../domain/entities/user-profile.entity';
import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

export const getProfile = async (
  profileRepo: IUserProfileRepository,
  uid: string,
): Promise<UserProfile> => {
  const profile = await profileRepo.findByUid(uid);
  if (!profile) throw new AppError('Profile not found', 404, 'NOT_FOUND');
  return profile;
};
