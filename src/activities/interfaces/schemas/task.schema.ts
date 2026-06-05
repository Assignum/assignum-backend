import { z } from 'zod';

export const addTasksSchema = z.object({
  tasks: z.array(z.object({ name: z.string().min(1) })).min(1, 'At least one task required'),
});

export const updateTaskSchema = z.object({
  status: z.enum(['Pendiente', 'En Progreso', 'Entregado', 'Verificado']).optional(),
  comments: z.string().optional(),
  files: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});
