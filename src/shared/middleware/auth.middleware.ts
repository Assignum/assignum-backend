import { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error';
import { auth } from '../infrastructure/firebase/firebase-admin';

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email ?? '';
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};
