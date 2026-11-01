import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { BUDGET_ADVICE_PER_DAY } from '../../config/constants.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { validate } from '../../middleware/validate.js';
import { monthParamSchema } from '../../domain/common.schemas.js';
import * as budgetsController from './budgets.controller.js';
import { budgetAdviceSchema, upsertBudgetSchema } from './budgets.schemas.js';

/** Per household per day, counted in memory (a restart resets it). */
const adviceRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: BUDGET_ADVICE_PER_DAY,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.householdId ?? req.auth?.userId ?? 'anonymous',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'The budget assistant has answered enough for today. Try again tomorrow.' } },
});

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);
// Before /:month, so "recommendation" isn't read as a month.
budgetsRouter.get('/recommendation', budgetsController.recommendation);
budgetsRouter.post('/advice', requireHead, adviceRateLimit, validate({ body: budgetAdviceSchema }), budgetsController.advice);
budgetsRouter.get('/:month', validate({ params: monthParamSchema }), budgetsController.getByMonth);
budgetsRouter.put(
  '/:month',
  requireHead,
  validate({ params: monthParamSchema, body: upsertBudgetSchema }),
  budgetsController.upsert,
);
