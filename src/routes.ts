import { Router } from 'express';
import { env } from './config/env.js';
import { attachmentsRouter } from './modules/attachments/attachments.routes.js';
import { filesRouter } from './modules/attachments/files.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { budgetsRouter } from './modules/budgets/budgets.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { householdsRouter } from './modules/households/households.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/household', householdsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/budgets', budgetsRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/attachments', attachmentsRouter);
if (env.STORAGE_DRIVER === 'local') apiRouter.use('/files', filesRouter);
