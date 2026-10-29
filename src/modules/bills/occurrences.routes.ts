import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../shared/common.schemas.js';
import * as occurrencesController from './occurrences.controller.js';
import { listOccurrencesQuerySchema, payOccurrenceSchema, updateOccurrenceSchema } from './bills.schemas.js';

export const occurrencesRouter = Router();

occurrencesRouter.use(requireAuth);
occurrencesRouter.get('/', validate({ query: listOccurrencesQuerySchema }), occurrencesController.list);
occurrencesRouter.patch(
  '/:id',
  requireHead,
  validate({ params: idParamSchema, body: updateOccurrenceSchema }),
  occurrencesController.update,
);
// No requireHead: the responsible member may pay too. The service checks this against the row.
// JSON or multipart (with an optional receipt under "receipt").
occurrencesRouter.post(
  '/:id/pay',
  upload.array('receipt', 1),
  validate({ params: idParamSchema, body: payOccurrenceSchema }),
  occurrencesController.pay,
);
occurrencesRouter.post('/:id/unpay', requireHead, validate({ params: idParamSchema }), occurrencesController.unpay);
