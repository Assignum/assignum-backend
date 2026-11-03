import { notifyEmail, notifyUid } from '@src/shared/infrastructure/notifications/notify.service';

import { Activity, isCompleted } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

/** Con cuántas horas de anticipación se avisa. */
export const REMINDER_WINDOW_HOURS = 48;

const LEADER_KEY = '__leader__';

/** Zona horaria de los usuarios: define qué día es "hoy" y "mañana" (Perú por defecto). */
const TIME_ZONE = process.env.APP_TIMEZONE || 'America/Lima';

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de los usuarios. */
const todayIn = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Días de calendario que faltan para la fecha límite (0 = vence hoy). */
const daysUntilDue = (dueDate: string, now: Date): number =>
  Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${todayIn(now)}T00:00:00Z`)) / 86_400_000);

const whenText = (days: number): string =>
  days <= 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`;

/**
 * Recordatorio de fecha límite: a cada estudiante con tareas sin completar y al líder con un
 * resumen. Cada recordatorio se envía una sola vez por fecha límite (si el líder la cambia,
 * se vuelve a avisar). Devuelve cuántos avisos se enviaron.
 */
export const sendDueReminders = async (repo: IActivityRepository, now = new Date()): Promise<number> => {
  const activities = await repo.findOpen();
  let sent = 0;

  for (const activity of activities) {
    // Se avisa cuando faltan 2 días o menos (48 h) y la fecha aún no pasó
    const days = daysUntilDue(activity.dueDate, now);
    if (days < 0 || days > REMINDER_WINDOW_HOURS / 24) continue;
    sent += await remindActivity(repo, activity, days);
  }
  return sent;
};

const remindActivity = async (repo: IActivityRepository, activity: Activity, days: number): Promise<number> => {
  const openTasks = activity.tasks.filter((t) => !isCompleted(t));
  if (openTasks.length === 0) return 0;

  const pendingByEmail = new Map<string, string[]>();
  for (const t of openTasks) {
    if (!t.assignedToEmail) continue;
    pendingByEmail.set(t.assignedToEmail, [...(pendingByEmail.get(t.assignedToEmail) ?? []), t.name]);
  }

  const keyOf = (who: string) => `${activity.dueDate}:${who}`;
  const wanted = [...pendingByEmail.keys(), LEADER_KEY].map(keyOf);

  // Reservar los recordatorios en una transacción para no duplicarlos si el job corre dos veces
  const toSend = await repo.mutate(activity.id, (current) => {
    const already = new Set(current.dueRemindersSent ?? []);
    const fresh = wanted.filter((k) => !already.has(k));
    return {
      changes: fresh.length ? { dueRemindersSent: [...already, ...fresh] } : null,
      result: new Set(fresh),
    };
  });

  const when = whenText(days);
  const jobs: Promise<void>[] = [];

  for (const [email, names] of pendingByEmail) {
    if (!toSend.has(keyOf(email))) continue;
    jobs.push(
      notifyEmail(email, {
        type: 'due_reminder',
        activityId: activity.id,
        title: `"${activity.name}" ${when}`,
        body: `Te ${names.length === 1 ? 'falta' : 'faltan'}: ${names.join(', ')}`,
      }),
    );
  }

  if (toSend.has(keyOf(LEADER_KEY))) {
    const unassigned = openTasks.filter((t) => !t.assignedToEmail).length;
    const unassignedNote = unassigned ? ` (${unassigned} sin asignar)` : '';
    jobs.push(
      notifyUid(activity.uid, {
        type: 'due_reminder',
        activityId: activity.id,
        title: `"${activity.name}" ${when}`,
        body: `${openTasks.length} ${openTasks.length === 1 ? 'tarea sigue' : 'tareas siguen'} sin completar${unassignedNote}.`,
      }),
    );
  }

  await Promise.all(jobs);
  return jobs.length;
};
