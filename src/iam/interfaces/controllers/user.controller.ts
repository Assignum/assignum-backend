import { Request, Response } from 'express';

import { FirestoreActivityRepository } from '@src/activities/infrastructure/repositories/firestore-activity.repository';
import { validate } from '@src/shared/validation/validate';

import { deleteAccount } from '../../application/use-cases/delete-account.use-case';
import { getProfile } from '../../application/use-cases/get-profile.use-case';
import { createProfile, updateProfile } from '../../application/use-cases/upsert-profile.use-case';
import { searchUserByEmail } from '../../application/use-cases/search-user.use-case';
import { CURRENT_PRIVACY_POLICY_VERSION, hasValidConsent } from '../../domain/entities/privacy-policy';
import { FirestoreUserProfileRepository } from '../../infrastructure/repositories/firestore-user-profile.repository';
import { createProfileSchema, updateProfileSchema } from '../schemas/user.schema';

const profileRepo = new FirestoreUserProfileRepository();
const activityRepo = new FirestoreActivityRepository();

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const profile = await getProfile(profileRepo, req.uid);
  // La app usa estos dos campos para pedir de nuevo la aceptación si cambió el aviso
  res.json({
    ...profile,
    currentPrivacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    consentRequired: !hasValidConsent(profile),
  });
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

export const deleteMe = async (req: Request, res: Response): Promise<void> => {
  await deleteAccount(activityRepo, profileRepo, req.uid, req.email);
  res.status(204).send();
};

export const searchUser = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query as { email: string };
  const user = await searchUserByEmail(profileRepo, email);
  res.json(user);
};
