import { Request, Response } from 'express';

import { validate } from '@src/shared/validation/validate';
import { FirestoreUserProfileRepository } from '@src/iam/infrastructure/repositories/firestore-user-profile.repository';

import { acceptInvitation } from '../../application/use-cases/accept-invitation.use-case';
import { declineInvitation } from '../../application/use-cases/decline-invitation.use-case';
import { getMembers } from '../../application/use-cases/get-members.use-case';
import { inviteMember } from '../../application/use-cases/invite-member.use-case';
import { removeMember } from '../../application/use-cases/remove-member.use-case';
import { FirestoreActivityRepository } from '../../infrastructure/repositories/firestore-activity.repository';
import { inviteSchema } from '../schemas/activity.schema';

const activityRepo = new FirestoreActivityRepository();
const userRepo = new FirestoreUserProfileRepository();

export const getMembersHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const members = await getMembers(activityRepo, id, req.uid, req.email);
  res.json(members);
};

export const inviteMemberHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { email } = validate(inviteSchema, req.body);
  await inviteMember(activityRepo, userRepo, id, req.uid, email);
  res.status(201).json({ message: 'Invitation sent' });
};

export const acceptInvitationHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await acceptInvitation(activityRepo, userRepo, id, req.uid, req.email);
  res.json({ message: 'Invitation accepted' });
};

export const declineInvitationHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await declineInvitation(activityRepo, id, req.email);
  res.json({ message: 'Invitation declined' });
};

export const removeMemberHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, email } = req.params as { id: string; email: string };
  await removeMember(activityRepo, id, req.uid, email);
  res.json({ message: 'Member removed' });
};
