import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import * as invitesController from './invites.controller.js';
import { acceptInviteSchema, tokenParamSchema } from './invites.schemas.js';

/** Public invite links: /api/invites/:token. The head's invite management lives under /household/invites. */
export const invitesRouter = Router();

invitesRouter.get('/:token', validate({ params: tokenParamSchema }), invitesController.preview);
invitesRouter.post(
  '/:token/accept',
  requireAuth,
  validate({ params: tokenParamSchema, body: acceptInviteSchema }),
  invitesController.accept,
);
