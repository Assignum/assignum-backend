import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';

import { createActivity } from '../../application/use-cases/create-activity.use-case';
import { deleteActivity } from '../../application/use-cases/delete-activity.use-case';
import { finalizeActivity } from '../../application/use-cases/finalize-activity.use-case';
import { getActivities } from '../../application/use-cases/get-activities.use-case';
import { getActivity } from '../../application/use-cases/get-activity.use-case';
import { updateActivity } from '../../application/use-cases/update-activity.use-case';
import { FirestoreActivityRepository } from '../../infrastructure/repositories/firestore-activity.repository';
import { createActivitySchema, updateActivitySchema } from '../schemas/activity.schema';

const repo = new FirestoreActivityRepository();

export const listActivities = async (req: Request, res: Response): Promise<void> => {
  const activities = await getActivities(repo, req.uid, req.email);
  res.json(activities);
};

export const createActivityHandler = async (req: Request, res: Response): Promise<void> => {
  const dto = validate(createActivitySchema, req.body);
  const activity = await createActivity(repo, req.uid, dto);
  res.status(201).json(activity);
};

export const getActivityHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const activity = await getActivity(repo, id, req.uid, req.email);
  res.json(activity);
};

export const updateActivityHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const dto = validate(updateActivitySchema, req.body);
  await updateActivity(repo, id, req.uid, dto);
  res.json({ message: 'Activity updated' });
};

export const deleteActivityHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await deleteActivity(repo, id, req.uid);
  res.json({ message: 'Activity deleted' });
};

export const finalizeActivityHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await finalizeActivity(repo, id, req.uid);
  res.json({ message: 'Activity finalized' });
};
