import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './shared/errors/error-handler';
import { maskEmailsIn } from './shared/privacy/mask';
import swaggerSpec from './shared/swagger/swagger.spec';
import authRouter from './iam/interfaces/routers/auth.router';
import userRouter from './iam/interfaces/routers/user.router';
import activityRouter from './activities/interfaces/routers/activity.router';
import notificationRouter from './notifications/interfaces/routers/notification.router';
import dashboardRouter from './dashboard/interfaces/routers/dashboard.router';
import chatRouter from './chatbox/interfaces/routers/chat.router';
import { jobsRouter } from './jobs/due-reminders.job';

const app = express();

// Render (y casi cualquier hosting) pone un proxy delante: así req.ip es la IP real del cliente
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }));
// Algunas rutas llevan correos (p. ej. /invitations/:email): no se escriben completos en el log
morgan.token('url', (req) => maskEmailsIn((req as express.Request).originalUrl ?? req.url ?? ''));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/activities', activityRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);
app.use('/api/jobs', jobsRouter);

app.use(errorHandler);

export default app;
