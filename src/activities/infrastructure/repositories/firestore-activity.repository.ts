import { db } from '@src/shared/infrastructure/firebase/firebase-admin';

import { AppError } from '@src/shared/errors/app-error';

import { Activity } from '../../domain/entities/activity.entity';
import { ActivityMutation, IActivityRepository } from '../../domain/repositories/activity.repository';

export class FirestoreActivityRepository implements IActivityRepository {
  private collection = db.collection('activities');

  async findById(id: string): Promise<Activity | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Activity;
  }

  async findByUserContext(uid: string, email: string): Promise<Activity[]> {
    const [leaderSnap, memberSnap] = await Promise.all([
      this.collection.where('uid', '==', uid).get(),
      this.collection.where('acceptedEmails', 'array-contains', email).get(),
    ]);

    const map = new Map<string, Activity>();
    leaderSnap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Activity));
    memberSnap.docs.forEach((d) => {
      if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() } as Activity);
    });

    return Array.from(map.values());
  }

  async findByInvitedEmail(email: string): Promise<Activity[]> {
    const snap = await this.collection.where('invitedEmails', 'array-contains', email).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
  }

  async findOpen(): Promise<Activity[]> {
    const snap = await this.collection.where('finalized', '==', false).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
  }

  async create(activity: Activity): Promise<void> {
    const { id, ...data } = activity;
    await this.collection.doc(id).set(data);
  }

  async update(id: string, data: Partial<Activity>): Promise<void> {
    await this.collection.doc(id).update(data as FirebaseFirestore.UpdateData<Activity>);
  }

  async mutate<T>(id: string, fn: ActivityMutation<T>): Promise<T> {
    const ref = this.collection.doc(id);
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new AppError('Activity not found', 404, 'NOT_FOUND');
      const { changes, result } = fn({ id: doc.id, ...doc.data() } as Activity);
      if (changes) tx.update(ref, changes as FirebaseFirestore.UpdateData<Activity>);
      return result;
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
