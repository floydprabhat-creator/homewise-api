import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { BILL_SCANS_PER_DAY } from '../../config/constants.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { upload } from '../../middleware/upload.js';
import * as scanController from './scan.controller.js';

/** Per household per day, counted in memory (a restart resets it). */
const scanRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: BILL_SCANS_PER_DAY,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.householdId ?? req.auth?.userId ?? 'anonymous',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: `Your household has read ${BILL_SCANS_PER_DAY} bills today. Try again tomorrow.` } },
});

export const scanRouter = Router();

scanRouter.use(requireAuth);
scanRouter.get('/', scanController.status);
scanRouter.post('/', scanRateLimit, upload.single('file'), scanController.scan);
