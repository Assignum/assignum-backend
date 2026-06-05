import { IFirebaseAuthService } from '../../infrastructure/services/firebase-auth.service';

export const forgotPassword = async (
  authService: IFirebaseAuthService,
  email: string,
): Promise<void> => {
  await authService.sendPasswordResetEmail(email);
};
