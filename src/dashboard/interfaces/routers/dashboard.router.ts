import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { getStatsHandler } from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);
router.get('/stats', getStatsHandler);

export default router;
