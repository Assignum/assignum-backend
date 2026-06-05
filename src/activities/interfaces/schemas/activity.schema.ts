import { z } from 'zod';

export const createActivitySchema = z.object({
  name: z.string().min(1, 'name is required'),
  dueDate: z.string().min(1, 'dueDate is required'),
  documentLink: z.string().nullable().optional(),
  tasks: z.array(z.object({ name: z.string().min(1) })).default([]),
});

export const updateActivitySchema = z.object({
  name: z.string().min(1).optional(),
  dueDate: z.string().min(1).optional(),
  documentLink: z.string().nullable().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
});
