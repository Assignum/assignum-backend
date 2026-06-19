import { z } from 'zod';

const taskTypeEnum = z.enum(['Backend', 'Frontend', 'Testing', 'Database', 'Documentation', 'Management']);
const taskComplexityEnum = z.enum(['Low', 'Medium', 'High']);
const taskPriorityEnum = z.enum(['Low', 'Medium', 'High']);

export const addTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().min(1),
        taskType: taskTypeEnum,
        taskComplexity: taskComplexityEnum,
        priority: taskPriorityEnum,
        estimatedHours: z.number().int().min(1).max(100),
      }),
    )
    .min(1, 'At least one task required'),
});

export const updateTaskSchema = z.object({
  status: z.enum(['Pendiente', 'En Progreso', 'Entregado', 'Verificado']).optional(),
  comments: z.string().optional(),
  files: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});
