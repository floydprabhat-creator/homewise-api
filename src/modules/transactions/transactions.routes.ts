import { Router } from 'express';
import { MAX_FILES_PER_ENTRY } from '../../config/constants.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../domain/common.schemas.js';
import * as transactionsController from './transactions.controller.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from './transactions.schemas.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);
transactionsRouter.get('/', validate({ query: listTransactionsQuerySchema }), transactionsController.list);
// JSON or multipart (with up to 3 files under "files").
transactionsRouter.post(
  '/',
  upload.array('files', MAX_FILES_PER_ENTRY),
  validate({ body: createTransactionSchema }),
  transactionsController.create,
);
transactionsRouter.get('/:id', validate({ params: idParamSchema }), transactionsController.get);
transactionsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTransactionSchema }),
  transactionsController.update,
);
transactionsRouter.delete('/:id', validate({ params: idParamSchema }), transactionsController.remove);
transactionsRouter.post(
  '/:id/attachments',
  upload.array('files', MAX_FILES_PER_ENTRY),
  validate({ params: idParamSchema }),
  transactionsController.addAttachments,
);
