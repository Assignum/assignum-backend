import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';

import {
  createActivityHandler,
  deleteActivityHandler,
  finalizeActivityHandler,
  getActivityHandler,
  listActivities,
  updateActivityHandler,
} from '../controllers/activity.controller';
import {
  acceptInvitationHandler,
  declineInvitationHandler,
  getMembersHandler,
  inviteMemberHandler,
  removeMemberHandler,
} from '../controllers/member.controller';
import {
  addTasksHandler,
  assignTasksHandler,
  deleteTaskHandler,
  updateTaskHandler,
  verifyTaskHandler,
} from '../controllers/task.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listActivities);
router.post('/', createActivityHandler);
router.get('/:id', getActivityHandler);
router.put('/:id', updateActivityHandler);
router.delete('/:id', deleteActivityHandler);
router.post('/:id/finalize', finalizeActivityHandler);

router.post('/:id/tasks', addTasksHandler);
router.put('/:id/tasks/:taskId', updateTaskHandler);
router.delete('/:id/tasks/:taskId', deleteTaskHandler);
router.post('/:id/tasks/assign', assignTasksHandler);
router.post('/:id/tasks/:taskId/verify', verifyTaskHandler);

router.get('/:id/members', getMembersHandler);
router.post('/:id/invitations', inviteMemberHandler);
router.post('/:id/invitations/accept', acceptInvitationHandler);
router.post('/:id/invitations/decline', declineInvitationHandler);
router.delete('/:id/members/:email', removeMemberHandler);

export default router;
