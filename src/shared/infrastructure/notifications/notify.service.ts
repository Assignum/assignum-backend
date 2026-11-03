import admin, { db } from '@src/shared/infrastructure/firebase/firebase-admin';
import { maskEmail } from '@src/shared/privacy/mask';

export type NotificationType =
  | 'invitation'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'invitation_cancelled'
  | 'member_removed'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_delivered'
  | 'due_reminder'
  | 'due_date_changed'
  | 'member_left'
  | 'leadership_transferred';

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body: string;
  activityId: string;
}

interface NotifyOptions {
  /** Guardar en la bandeja de la app además de enviar el push (por defecto true). */
  persist?: boolean;
}

export const INBOX_COLLECTION = 'inbox';

const findUserByEmail = async (email: string): Promise<{ fcmToken?: string } | null> => {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as { fcmToken?: string });
};

/**
 * Avisa a un usuario: guarda el aviso en su bandeja (para que no se pierda si el push no llega)
 * y envía una notificación push si tiene token. Nunca lanza: un aviso fallido no debe
 * romper la operación que lo originó.
 */
export const notifyEmail = async (
  email: string,
  payload: NotifyPayload,
  { persist = true }: NotifyOptions = {},
): Promise<void> => {
  try {
    if (persist) {
      await db.collection(INBOX_COLLECTION).add({
        recipientEmail: email,
        ...payload,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const user = await findUserByEmail(email);
    if (!user?.fcmToken) return;
    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: { type: payload.type, activityId: payload.activityId },
      android: { notification: { channelId: 'default', priority: 'high' } },
    });
  } catch (err) {
    console.warn(`[notify] No se pudo avisar a ${maskEmail(email)}:`, (err as Error).message);
  }
};

/** Días que se conservan los avisos de la bandeja. */
export const INBOX_RETENTION_DAYS = 60;

/**
 * Borra los avisos más antiguos que `INBOX_RETENTION_DAYS` para que la bandeja no crezca sin
 * límite. Borra en lotes de hasta 400 por llamada; el job la ejecuta cada hora.
 */
export const purgeOldInbox = async (now = new Date()): Promise<number> => {
  const cutoff = new Date(now.getTime() - INBOX_RETENTION_DAYS * 24 * 3_600_000).toISOString();
  const snap = await db.collection(INBOX_COLLECTION).where('createdAt', '<', cutoff).limit(400).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
};

/** Avisa al usuario dueño de `uid` (p. ej. el líder de una actividad). */
export const notifyUid = async (uid: string, payload: NotifyPayload, options?: NotifyOptions): Promise<void> => {
  try {
    const doc = await db.collection('users').doc(uid).get();
    const email = doc.data()?.email as string | undefined;
    if (email) await notifyEmail(email, payload, options);
  } catch (err) {
    console.warn(`[notify] No se pudo avisar al usuario ${uid}:`, (err as Error).message);
  }
};
