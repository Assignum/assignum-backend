import { AppError } from '@src/shared/errors/app-error';

import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

export const searchUserByEmail = async (
  profileRepo: IUserProfileRepository,
  email: string,
): Promise<{ uid: string; email: string }> => {
  const user = await profileRepo.findByEmail(email);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};
