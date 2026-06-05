import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './shared/errors/error-handler';
import swaggerSpec from './shared/swagger/swagger.spec';
import authRouter from './iam/interfaces/routers/auth.router';
import userRouter from './iam/interfaces/routers/user.router';
import activityRouter from './activities/interfaces/routers/activity.router';
import notificationRouter from './notifications/interfaces/routers/notification.router';
import dashboardRouter from './dashboard/interfaces/routers/dashboard.router';
import chatRouter from './chatbox/interfaces/routers/chat.router';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }));
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

app.use(errorHandler);

export default app;
