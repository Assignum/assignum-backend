import { Request, Response } from 'express';

import { getStats } from '../../application/use-cases/get-stats.use-case';
import { FirestoreDashboardRepository } from '../../infrastructure/repositories/firestore-dashboard.repository';

const repo = new FirestoreDashboardRepository();

export const getStatsHandler = async (req: Request, res: Response): Promise<void> => {
  const stats = await getStats(repo, req.uid, req.email);
  res.json(stats);
};
