import { InboxItem, Notification } from '../entities/notification.entity';

export interface INotificationRepository {
  getForUser(email: string): Promise<Notification[]>;
  getInbox(email: string, limit: number): Promise<InboxItem[]>;
  markInboxRead(email: string): Promise<void>;
}
