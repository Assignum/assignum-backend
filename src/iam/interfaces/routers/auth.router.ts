import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';
import { authRateLimit } from '@src/shared/middleware/rate-limit.middleware';

import { forgotPasswordHandler, login, logout, register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', authRateLimit, forgotPasswordHandler);

export default router;
