import { ZodSchema } from 'zod';

import { AppError } from '../errors/app-error';

export const validate = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }
  return result.data;
};
