import { Request, Response } from 'express';

import { getInbox, markInboxRead } from '../../application/use-cases/get-inbox.use-case';
import { getNotifications } from '../../application/use-cases/get-notifications.use-case';
import { FirestoreNotificationRepository } from '../../infrastructure/repositories/firestore-notification.repository';

const repo = new FirestoreNotificationRepository();

export const getNotificationsHandler = async (req: Request, res: Response): Promise<void> => {
  const notifications = await getNotifications(repo, req.email);
  res.json(notifications);
};

export const getInboxHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(await getInbox(repo, req.email));
};

export const markInboxReadHandler = async (req: Request, res: Response): Promise<void> => {
  await markInboxRead(repo, req.email);
  res.json({ message: 'Inbox marked as read' });
};
