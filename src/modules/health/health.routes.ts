import { Router } from 'express';
import { pingDb } from '../../db/index.js';
import { logger } from '../../lib/logger.js';

/** Railway's health check: 200 when the API can reach Postgres, 503 when it can't. No auth. */
export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Health check: database unreachable');
    res.status(503).json({ status: 'unavailable' });
  }
});
