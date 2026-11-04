import app from './app';
import { startDueRemindersJob } from './jobs/due-reminders.job';
import { warmUpMl } from './shared/infrastructure/ml/ml-recommend.service';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[server] Assignum backend running on port ${PORT}`);
  startDueRemindersJob();
  // Si el backend estaba dormido, el ML seguramente también: que arranquen a la vez
  warmUpMl();
});
