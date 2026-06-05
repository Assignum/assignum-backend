import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';

import { getProfile } from '../../application/use-cases/get-profile.use-case';
import { createProfile, updateProfile } from '../../application/use-cases/upsert-profile.use-case';
import { searchUserByEmail } from '../../application/use-cases/search-user.use-case';
import { FirestoreUserProfileRepository } from '../../infrastructure/repositories/firestore-user-profile.repository';
import { createProfileSchema, updateProfileSchema } from '../schemas/user.schema';

const profileRepo = new FirestoreUserProfileRepository();

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const profile = await getProfile(profileRepo, req.uid);
  res.json(profile);
};

export const createMyProfile = async (req: Request, res: Response): Promise<void> => {
  const data = validate(createProfileSchema, req.body);
  await createProfile(profileRepo, req.uid, data);
  res.status(201).json({ message: 'Profile created' });
};

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  const data = validate(updateProfileSchema, req.body);
  await updateProfile(profileRepo, req.uid, data);
  res.json({ message: 'Profile updated' });
};

export const searchUser = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query as { email: string };
  const user = await searchUserByEmail(profileRepo, email);
  res.json(user);
};
