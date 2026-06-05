import { auth, db } from '@src/shared/infrastructure/firebase/firebase-admin';

import { PartialUserProfile, UserProfile } from '../../domain/entities/user-profile.entity';
import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

export class FirestoreUserProfileRepository implements IUserProfileRepository {
  private collection = db.collection('users');

  async findByUid(uid: string): Promise<UserProfile | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return { uid, ...doc.data() } as UserProfile;
  }

  async findByEmail(email: string): Promise<{ uid: string; email: string } | null> {
    try {
      const userRecord = await auth.getUserByEmail(email);
      return { uid: userRecord.uid, email: userRecord.email ?? email };
    } catch {
      return null;
    }
  }

  async createEmpty(uid: string, email: string): Promise<void> {
    await this.collection.doc(uid).set(
      { email, fullName: '', birthDate: null, disponibilidad: null, cargaAcademica: null, trabajoEnEquipo: null, comunicacion: null, horasEstudio: null },
      { merge: true },
    );
  }

  async save(uid: string, data: PartialUserProfile & { email?: string }): Promise<void> {
    await this.collection.doc(uid).set(data, { merge: false });
  }

  async merge(uid: string, data: PartialUserProfile): Promise<void> {
    await this.collection.doc(uid).set(data, { merge: true });
  }
}
