import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { getNotificationsHandler } from '../controllers/notification.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getNotificationsHandler);

export default router;
