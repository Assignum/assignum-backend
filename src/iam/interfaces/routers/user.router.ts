import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import { createMyProfile, getMe, searchUser, updateMyProfile } from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.post('/me/profile', createMyProfile);
router.put('/me/profile', updateMyProfile);
router.get('/search', searchUser);

export default router;
