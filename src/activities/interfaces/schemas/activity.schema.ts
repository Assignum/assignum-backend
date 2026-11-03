import { z } from 'zod';

export const createActivitySchema = z.object({
  name: z.string().min(1, 'name is required'),
  dueDate: z.string().min(1, 'dueDate is required'),
  documentLink: z.string().nullable().optional(),
  tasks: z.array(z.object({ name: z.string().min(1) })).default([]),
});

export const updateActivitySchema = z.object({
  name: z.string().trim().min(1).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').optional(),
  documentLink: z.string().nullable().optional(),
});

export const transferLeadershipSchema = z.object({
  email: z.string().email('Invalid email'),
});

export const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
});
