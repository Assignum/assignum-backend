import { Request, Response, Router } from 'express';

import { sendDueReminders } from '@src/activities/application/use-cases/send-due-reminders.use-case';
import { FirestoreActivityRepository } from '@src/activities/infrastructure/repositories/firestore-activity.repository';
import { AppError } from '@src/shared/errors/app-error';
import { purgeOldInbox } from '@src/shared/infrastructure/notifications/notify.service';

const repo = new FirestoreActivityRepository();
const HOUR_MS = 60 * 60 * 1000;

const runDueReminders = async (): Promise<number> => {
  try {
    const sent = await sendDueReminders(repo);
    if (sent) console.log(`[jobs] ${sent} recordatorio(s) de fecha límite enviados`);
    const purged = await purgeOldInbox();
    if (purged) console.log(`[jobs] ${purged} aviso(s) antiguos eliminados de la bandeja`);
    return sent;
  } catch (err) {
    console.error('[jobs] Error enviando recordatorios:', (err as Error).message);
    return 0;
  }
};

/**
 * Revisa cada hora mientras el servidor esté despierto. En hosting que duerme el proceso
 * (p. ej. Render free) además conviene llamar a POST /api/jobs/due-reminders desde un cron
 * externo con el header `x-cron-secret`.
 */
export const startDueRemindersJob = (): void => {
  setTimeout(() => void runDueReminders(), 60_000);
  setInterval(() => void runDueReminders(), HOUR_MS).unref();
};

export const jobsRouter = Router();

jobsRouter.post('/due-reminders', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError('Cron endpoint disabled (CRON_SECRET not set)', 404, 'NOT_FOUND');
  if (req.header('x-cron-secret') !== secret) throw new AppError('Invalid cron secret', 401, 'UNAUTHORIZED');
  const sent = await runDueReminders();
  res.json({ sent });
});
