import { db } from '@src/shared/infrastructure/firebase/firebase-admin';

import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository';

export class FirestoreNotificationRepository implements INotificationRepository {
  async getForUser(email: string): Promise<Notification[]> {
    const snap = await db
      .collection('activities')
      .where('invitedEmails', 'array-contains', email)
      .get();

    const notifications: Notification[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      let leaderName = data.uid as string;
      try {
        const leaderDoc = await db.collection('users').doc(data.uid as string).get();
        if (leaderDoc.exists) {
          leaderName = (leaderDoc.data()?.fullName as string) || leaderName;
        }
      } catch {
        // fall back to uid
      }

      notifications.push({
        activityId: doc.id,
        activityName: data.name as string,
        leaderName,
        dueDate: data.dueDate as string,
      });
    }

    return notifications;
  }
}
