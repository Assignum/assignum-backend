import { Request, Response } from 'express';

import { getNotifications } from '../../application/use-cases/get-notifications.use-case';
import { FirestoreNotificationRepository } from '../../infrastructure/repositories/firestore-notification.repository';

const repo = new FirestoreNotificationRepository();

export const getNotificationsHandler = async (req: Request, res: Response): Promise<void> => {
  const notifications = await getNotifications(repo, req.email);
  res.json(notifications);
};
