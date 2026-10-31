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

// Some URLs carry credentials: the invite token (valid for 7 days) and the signature on file links.
const SECRET_IN_URL: [RegExp, string][] = [
  [/^(\/api\/invites\/)[^/?]+/, '$1[redacted]'],
  [/^(\/api\/files\/[^?]*)\?.*$/, '$1?[redacted]'],
];
const maskUrl = (url: string) => SECRET_IN_URL.reduce((u, [pattern, replacement]) => u.replace(pattern, replacement), url);

app.use(
  pinoHttp({
    logger,
    serializers: { req: (req: { url: string }) => Object.assign(req, { url: maskUrl(req.url) }) },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ message: 'Hello ! Welcome to HomeWise' });
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
