import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { validate } from '../../middleware/validate.js';
import { monthParamSchema } from '../../domain/common.schemas.js';
import * as budgetsController from './budgets.controller.js';
import { upsertBudgetSchema } from './budgets.schemas.js';

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);
// Before /:month, so "recommendation" isn't read as a month.
budgetsRouter.get('/recommendation', budgetsController.recommendation);
budgetsRouter.get('/:month', validate({ params: monthParamSchema }), budgetsController.getByMonth);
budgetsRouter.put(
  '/:month',
  requireHead,
  validate({ params: monthParamSchema, body: upsertBudgetSchema }),
  budgetsController.upsert,
);
