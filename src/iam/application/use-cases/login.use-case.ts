import { IFirebaseAuthService } from '../../infrastructure/services/firebase-auth.service';

interface LoginDto {
  email: string;
  password: string;
}

export const loginUser = async (
  authService: IFirebaseAuthService,
  dto: LoginDto,
): Promise<{ uid: string; idToken: string; email: string }> => {
  const { localId: uid, idToken, email } = await authService.login(dto.email, dto.password);
  return { uid, idToken, email };
};
