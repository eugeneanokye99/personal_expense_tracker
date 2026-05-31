import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import budgetsRoutes from './modules/budgets/budgets.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import emailRoutes from './modules/email/email.routes';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Parsing ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api', rateLimiter);

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'SpendWisely API', ts: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
const V1 = '/api/v1';
app.use(`${V1}/auth`, authRoutes);
app.use(`${V1}/users`, usersRoutes);
app.use(`${V1}/expenses`, expensesRoutes);
app.use(`${V1}/budgets`, budgetsRoutes);
app.use(`${V1}/notifications`, notificationsRoutes);
app.use(`${V1}/email`, emailRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 SpendWisely API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
