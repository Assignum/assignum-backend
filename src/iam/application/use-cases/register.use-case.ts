import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';
import { IFirebaseAuthService } from '../../infrastructure/services/firebase-auth.service';

interface RegisterDto {
  email: string;
  password: string;
}

export const registerUser = async (
  authService: IFirebaseAuthService,
  profileRepo: IUserProfileRepository,
  dto: RegisterDto,
): Promise<{ uid: string; idToken: string; email: string }> => {
  const { localId: uid, idToken, email } = await authService.register(dto.email, dto.password);
  await profileRepo.createEmpty(uid, email);
  return { uid, idToken, email };
};
