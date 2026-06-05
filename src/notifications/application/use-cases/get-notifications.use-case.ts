import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository';

export const getNotifications = async (
  repo: INotificationRepository,
  email: string,
): Promise<Notification[]> => {
  return repo.getForUser(email);
};
