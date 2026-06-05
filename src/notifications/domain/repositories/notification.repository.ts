import { Notification } from '../entities/notification.entity';

export interface INotificationRepository {
  getForUser(email: string): Promise<Notification[]>;
}
