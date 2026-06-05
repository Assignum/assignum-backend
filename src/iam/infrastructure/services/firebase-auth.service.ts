import axios, { AxiosError } from 'axios';

import { AppError } from '@src/shared/errors/app-error';

const BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

interface FirebaseAuthResponse {
  localId: string;
  email: string;
  idToken: string;
  refreshToken: string;
}

export interface IFirebaseAuthService {
  register(email: string, password: string): Promise<FirebaseAuthResponse>;
  login(email: string, password: string): Promise<FirebaseAuthResponse>;
  sendPasswordResetEmail(email: string): Promise<void>;
}

const apiKey = (): string => {
  const key = process.env.FIREBASE_API_KEY;
  if (!key) throw new AppError('FIREBASE_API_KEY is not configured', 500);
  return key;
};

const extractFirebaseError = (err: unknown): string => {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? 'Authentication failed';
  }
  return 'Authentication failed';
};

export class FirebaseAuthService implements IFirebaseAuthService {
  async register(email: string, password: string): Promise<FirebaseAuthResponse> {
    try {
      const res = await axios.post<FirebaseAuthResponse>(
        `${BASE_URL}:signUp?key=${apiKey()}`,
        { email, password, returnSecureToken: true },
      );
      return res.data;
    } catch (err) {
      throw new AppError(extractFirebaseError(err), 400, 'REGISTER_FAILED');
    }
  }

  async login(email: string, password: string): Promise<FirebaseAuthResponse> {
    try {
      const res = await axios.post<FirebaseAuthResponse>(
        `${BASE_URL}:signInWithPassword?key=${apiKey()}`,
        { email, password, returnSecureToken: true },
      );
      return res.data;
    } catch (err) {
      throw new AppError(extractFirebaseError(err), 401, 'LOGIN_FAILED');
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await axios.post(
        `${BASE_URL}:sendOobCode?key=${apiKey()}`,
        { requestType: 'PASSWORD_RESET', email },
      );
    } catch (err) {
      throw new AppError(extractFirebaseError(err), 400, 'RESET_FAILED');
    }
  }
}
