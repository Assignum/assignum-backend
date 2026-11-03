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

export const editTaskSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    taskType: taskTypeEnum.optional(),
    taskComplexity: taskComplexityEnum.optional(),
    priority: taskPriorityEnum.optional(),
    estimatedHours: z.number().int().min(1).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const redistributionPreviewSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1, 'Select at least one task'),
  memberEmails: z.array(z.string().email()).min(1, 'Select at least one member'),
});

export const applyAssignmentsSchema = z.object({
  assignments: z
    .array(
      z.object({
        taskId: z.string().min(1),
        assignedToEmail: z.string().email().nullable(),
      }),
    )
    .min(1, 'At least one assignment required'),
  /** Modo que devolvió la vista previa ('ml' o 'fallback'); si se omite, es un cambio manual. */
  assignmentMode: z.enum(['ml', 'fallback', 'manual']).optional(),
});
