import { Router } from 'express';

import { authMiddleware } from '@src/shared/middleware/auth.middleware';
import { resendRateLimit } from '@src/shared/middleware/rate-limit.middleware';

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
  cancelInvitationHandler,
  declineInvitationHandler,
  getMembersHandler,
  inviteMemberHandler,
  leaveActivityHandler,
  removeMemberHandler,
  resendInvitationHandler,
  transferLeadershipHandler,
} from '../controllers/member.controller';
import {
  addTasksHandler,
  applyAssignmentsHandler,
  assignTasksHandler,
  deleteTaskHandler,
  editTaskHandler,
  previewRedistributionHandler,
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
// Antes de '/:id/tasks/:taskId' para que 'assignments' no se tome como taskId
router.put('/:id/tasks/assignments', applyAssignmentsHandler);
router.put('/:id/tasks/:taskId', updateTaskHandler);
router.patch('/:id/tasks/:taskId', editTaskHandler);
router.delete('/:id/tasks/:taskId', deleteTaskHandler);
router.post('/:id/tasks/assign', assignTasksHandler);
router.post('/:id/tasks/redistribute/preview', previewRedistributionHandler);
router.post('/:id/tasks/:taskId/verify', verifyTaskHandler);

router.get('/:id/members', getMembersHandler);
router.post('/:id/invitations', inviteMemberHandler);
router.post('/:id/invitations/accept', acceptInvitationHandler);
router.post('/:id/invitations/decline', declineInvitationHandler);
router.post('/:id/invitations/:email/resend', resendRateLimit, resendInvitationHandler);
router.delete('/:id/invitations/:email', cancelInvitationHandler);
router.delete('/:id/members/:email', removeMemberHandler);
router.post('/:id/leave', leaveActivityHandler);
router.post('/:id/leader', transferLeadershipHandler);

export default router;
