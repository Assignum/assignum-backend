import { Activity } from '../entities/activity.entity';

/**
 * Recibe la actividad leída dentro de la transacción y devuelve los cambios a guardar
 * (o `null` si no hay nada que escribir) junto con el valor que devolverá `mutate`.
 * Debe ser síncrona y sin efectos secundarios: Firestore puede reintentarla.
 */
export type ActivityMutation<T> = (activity: Activity) => { changes: Partial<Activity> | null; result: T };

export interface IActivityRepository {
  findById(id: string): Promise<Activity | null>;
  findByUserContext(uid: string, email: string): Promise<Activity[]>;
  findByInvitedEmail(email: string): Promise<Activity[]>;
  findOpen(): Promise<Activity[]>;
  create(activity: Activity): Promise<void>;
  update(id: string, data: Partial<Activity>): Promise<void>;
  /** Lee y escribe la actividad en una transacción para no pisar cambios concurrentes. */
  mutate<T>(id: string, fn: ActivityMutation<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
