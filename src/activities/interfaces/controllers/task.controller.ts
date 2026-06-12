import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';

import { addTasks } from '../../application/use-cases/add-tasks.use-case';
import { assignTasks } from '../../application/use-cases/assign-tasks.use-case';
import { deleteTask } from '../../application/use-cases/delete-task.use-case';
import { updateTask } from '../../application/use-cases/update-task.use-case';
import { verifyTask } from '../../application/use-cases/verify-task.use-case';
import { FirestoreActivityRepository } from '../../infrastructure/repositories/firestore-activity.repository';
import { addTasksSchema, updateTaskSchema } from '../schemas/task.schema';

const repo = new FirestoreActivityRepository();

export const addTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { tasks } = validate(addTasksSchema, req.body);
  const newTasks = await addTasks(repo, id, req.uid, tasks.map((t) => t.name));
  res.status(201).json(newTasks);
};

export const updateTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  const dto = validate(updateTaskSchema, req.body);
  await updateTask(repo, id, taskId, req.uid, req.email, dto);
  res.json({ message: 'Task updated' });
};

export const deleteTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  await deleteTask(repo, id, taskId, req.uid);
  res.json({ message: 'Task deleted' });
};

export const assignTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await assignTasks(repo, id, req.uid, req.email);
  res.json({ message: 'Tasks assigned via round-robin' });
};

export const verifyTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  await verifyTask(repo, id, taskId, req.uid);
  res.json({ message: 'Task verified' });
};
