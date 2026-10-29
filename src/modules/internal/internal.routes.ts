import { Router } from 'express';
import { isProduction } from '../../config/env.js';
import { jobs } from '../../jobs/registry.js';
import { requireCronSecret } from '../../middleware/require-cron-secret.js';
import { validate } from '../../middleware/validate.js';
import { todayIST } from '../../utils/dates.js';
import { jobNameSchema, runJobBodySchema } from './internal.schemas.js';

/** For an external scheduler (or a developer): run a job on demand. */
export const internalRouter = Router();

internalRouter.post(
  '/jobs/:name/run',
  requireCronSecret,
  validate({ params: jobNameSchema, body: runJobBodySchema }),
  async (req, res) => {
    const name = res.locals.params.name as keyof typeof jobs;
    const today = !isProduction && req.body.date ? req.body.date : todayIST();
    res.json({ job: name, today, result: await jobs[name](today) });
  },
);
