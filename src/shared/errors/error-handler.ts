import { NextFunction, Request, Response } from 'express';

import { AppError } from './app-error';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
    });
    return;
  }

  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
};
