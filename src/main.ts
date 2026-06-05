import 'module-alias/register';

import app from './app';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[server] Assignum backend running on port ${PORT}`);
});
