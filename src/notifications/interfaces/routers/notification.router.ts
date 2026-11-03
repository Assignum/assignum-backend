import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { getInboxHandler, getNotificationsHandler, markInboxReadHandler } from '../controllers/notification.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getNotificationsHandler);
router.get('/inbox', getInboxHandler);
router.post('/inbox/read', markInboxReadHandler);

export default router;
