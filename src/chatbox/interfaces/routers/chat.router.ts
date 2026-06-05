import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { deleteHistoryHandler, getHistoryHandler, sendMessageHandler } from '../controllers/chat.controller';

const router = Router();

router.use(authMiddleware);
router.post('/message', sendMessageHandler);
router.get('/history', getHistoryHandler);
router.delete('/history', deleteHistoryHandler);

export default router;
