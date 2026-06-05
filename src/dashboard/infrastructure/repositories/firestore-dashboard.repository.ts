import { db } from '@src/shared/infrastructure/firebase/firebase-admin';

import { DashboardStats, IDashboardRepository } from '../../domain/repositories/dashboard.repository';

export class FirestoreDashboardRepository implements IDashboardRepository {
  async getStats(uid: string, email: string): Promise<DashboardStats> {
    const [leaderSnap, memberSnap] = await Promise.all([
      db.collection('activities').where('uid', '==', uid).get(),
      db.collection('activities').where('acceptedEmails', 'array-contains', email).get(),
    ]);

    const map = new Map<string, FirebaseFirestore.DocumentData>();
    leaderSnap.docs.forEach((d) => map.set(d.id, d.data()));
    memberSnap.docs.forEach((d) => { if (!map.has(d.id)) map.set(d.id, d.data()); });

    const allActivities = Array.from(map.values());
    const totalActivities = allActivities.length;

    let pendingTasks = 0;
    let upcomingActivities = 0;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const activity of allActivities) {
      const tasks = (activity.tasks ?? []) as Array<{ assignedToEmail: string; status: string }>;
      pendingTasks += tasks.filter(
        (t) => t.assignedToEmail === email && t.status === 'Pendiente',
      ).length;

      const dueDate = new Date(activity.dueDate as string);
      if (dueDate >= now && dueDate <= sevenDaysLater) {
        upcomingActivities++;
      }
    }

    return { totalActivities, pendingTasks, upcomingActivities };
  }
}
