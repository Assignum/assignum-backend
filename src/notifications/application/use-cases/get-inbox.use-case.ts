import { InboxItem } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository';

const INBOX_LIMIT = 50;

export const getInbox = async (repo: INotificationRepository, email: string): Promise<InboxItem[]> =>
  repo.getInbox(email, INBOX_LIMIT);

export const markInboxRead = async (repo: INotificationRepository, email: string): Promise<void> =>
  repo.markInboxRead(email);
