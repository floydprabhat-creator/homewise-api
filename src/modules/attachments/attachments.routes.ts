import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../shared/common.schemas.js';
import * as attachmentsController from './attachments.controller.js';

export const attachmentsRouter = Router();

attachmentsRouter.use(requireAuth);
attachmentsRouter.get('/:id/url', validate({ params: idParamSchema }), attachmentsController.signedUrl);
attachmentsRouter.delete('/:id', validate({ params: idParamSchema }), attachmentsController.remove);
