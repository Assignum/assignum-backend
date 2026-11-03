import { db } from '@src/shared/infrastructure/firebase/firebase-admin';
import { INBOX_COLLECTION } from '@src/shared/infrastructure/notifications/notify.service';

import { InboxItem, Notification } from '../../domain/entities/notification.entity';
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

  async getInbox(email: string, limit: number): Promise<InboxItem[]> {
    // Se ordena en memoria para no requerir un índice compuesto en Firestore
    const snap = await db.collection(INBOX_COLLECTION).where('recipientEmail', '==', email).get();
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type as string,
          title: data.title as string,
          body: data.body as string,
          activityId: data.activityId as string,
          read: Boolean(data.read),
          createdAt: data.createdAt as string,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async markInboxRead(email: string): Promise<void> {
    const snap = await db
      .collection(INBOX_COLLECTION)
      .where('recipientEmail', '==', email)
      .where('read', '==', false)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
}
