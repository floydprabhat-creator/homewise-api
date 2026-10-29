import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

/** 401 unless x-cron-secret matches CRON_SECRET. Without CRON_SECRET set, every call is refused. */
export const requireCronSecret: RequestHandler = (req, _res, next) => {
  const given = Buffer.from(req.get('x-cron-secret') ?? '');
  const expected = Buffer.from(env.CRON_SECRET ?? '');
  if (expected.length === 0 || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw AppError.unauthorized('Invalid cron secret');
  }
  next();
};
