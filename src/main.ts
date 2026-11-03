import app from './app';
import { startDueRemindersJob } from './jobs/due-reminders.job';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[server] Assignum backend running on port ${PORT}`);
  startDueRemindersJob();
});
