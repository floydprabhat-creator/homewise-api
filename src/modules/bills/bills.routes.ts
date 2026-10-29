import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../domain/common.schemas.js';
import * as billsController from './bills.controller.js';
import { createBillSchema, listBillsQuerySchema, updateBillSchema } from './bills.schemas.js';

export const billsRouter = Router();

billsRouter.use(requireAuth);
billsRouter.get('/', validate({ query: listBillsQuerySchema }), billsController.list);
billsRouter.post('/', requireHead, validate({ body: createBillSchema }), billsController.create);
billsRouter.patch(
  '/:id',
  requireHead,
  validate({ params: idParamSchema, body: updateBillSchema }),
  billsController.update,
);
billsRouter.delete('/:id', requireHead, validate({ params: idParamSchema }), billsController.remove);
