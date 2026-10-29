import cookieParser from 'cookie-parser';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { apiRouter } from './routes.js';

export const app = express();

app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ message: 'Hello ! Welcome to HomeWise' });
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
