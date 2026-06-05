import { auth } from '@src/shared/infrastructure/firebase/firebase-admin';

export const logoutUser = async (uid: string): Promise<void> => {
  await auth.revokeRefreshTokens(uid);
};
