import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { forgotPasswordHandler, login, logout, register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPasswordHandler);

export default router;
