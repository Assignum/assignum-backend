import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';
import { FirestoreUserProfileRepository } from '@src/iam/infrastructure/repositories/firestore-user-profile.repository';

import { addTasks } from '../../application/use-cases/add-tasks.use-case';
import { applyAssignments } from '../../application/use-cases/apply-assignments.use-case';
import { assignTasks } from '../../application/use-cases/assign-tasks.use-case';
import { deleteTask } from '../../application/use-cases/delete-task.use-case';
import { editTask } from '../../application/use-cases/edit-task.use-case';
import { previewRedistribution } from '../../application/use-cases/preview-redistribution.use-case';
import { updateTask } from '../../application/use-cases/update-task.use-case';
import { verifyTask } from '../../application/use-cases/verify-task.use-case';
import { FirestoreActivityRepository } from '../../infrastructure/repositories/firestore-activity.repository';
import {
  addTasksSchema,
  applyAssignmentsSchema,
  editTaskSchema,
  redistributionPreviewSchema,
  updateTaskSchema,
} from '../schemas/task.schema';

const repo = new FirestoreActivityRepository();
const profileRepo = new FirestoreUserProfileRepository();

export const addTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { tasks } = validate(addTasksSchema, req.body);
  const newTasks = await addTasks(repo, id, req.uid, tasks);
  res.status(201).json(newTasks);
};

export const updateTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  const dto = validate(updateTaskSchema, req.body);
  await updateTask(repo, id, taskId, req.uid, req.email, dto);
  res.json({ message: 'Task updated' });
};

export const editTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  const dto = validate(editTaskSchema, req.body);
  await editTask(repo, id, taskId, req.uid, dto);
  res.json({ message: 'Task edited' });
};

export const deleteTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  await deleteTask(repo, id, taskId, req.uid);
  res.json({ message: 'Task deleted' });
};

export const assignTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const mode = await assignTasks(repo, profileRepo, id, req.uid, req.email);
  res.json({
    message: mode === 'ml' ? 'Tasks assigned via ML recommendation' : 'Tasks assigned without ML (fallback)',
    assignmentMode: mode,
  });
};

export const previewRedistributionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const dto = validate(redistributionPreviewSchema, req.body);
  const { assignments, mode } = await previewRedistribution(repo, profileRepo, id, req.uid, req.email, dto);
  res.json({ assignments, assignmentMode: mode });
};

export const applyAssignmentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { assignments, assignmentMode } = validate(applyAssignmentsSchema, req.body);
  await applyAssignments(repo, id, req.uid, req.email, assignments, assignmentMode);
  res.json({ message: 'Assignments applied' });
};

export const verifyTaskHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params as { id: string; taskId: string };
  await verifyTask(repo, id, taskId, req.uid);
  res.json({ message: 'Task verified' });
};
