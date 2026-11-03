import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';
import { chatRateLimit } from '@src/shared/middleware/rate-limit.middleware';

import { deleteHistoryHandler, getHistoryHandler, sendMessageHandler } from '../controllers/chat.controller';

const router = Router();

router.use(authMiddleware);
router.post('/message', chatRateLimit, sendMessageHandler);
router.get('/history', getHistoryHandler);
router.delete('/history', deleteHistoryHandler);

export default router;
