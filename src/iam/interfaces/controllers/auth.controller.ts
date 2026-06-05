import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';

import { forgotPassword } from '../../application/use-cases/forgot-password.use-case';
import { loginUser } from '../../application/use-cases/login.use-case';
import { logoutUser } from '../../application/use-cases/logout.use-case';
import { registerUser } from '../../application/use-cases/register.use-case';
import { FirebaseAuthService } from '../../infrastructure/services/firebase-auth.service';
import { FirestoreUserProfileRepository } from '../../infrastructure/repositories/firestore-user-profile.repository';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../schemas/auth.schema';

const authService = new FirebaseAuthService();
const profileRepo = new FirestoreUserProfileRepository();

export const register = async (req: Request, res: Response): Promise<void> => {
  const dto = validate(registerSchema, req.body);
  const result = await registerUser(authService, profileRepo, dto);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const dto = validate(loginSchema, req.body);
  const result = await loginUser(authService, dto);
  res.json(result);
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await logoutUser(req.uid);
  res.json({ message: 'Logged out successfully' });
};

export const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { email } = validate(forgotPasswordSchema, req.body);
  await forgotPassword(authService, email);
  res.json({ message: 'Password reset email sent' });
};
