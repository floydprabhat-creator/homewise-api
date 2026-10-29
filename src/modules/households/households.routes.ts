import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../domain/common.schemas.js';
import * as invitesController from '../invites/invites.controller.js';
import { createInviteSchema } from '../invites/invites.schemas.js';
import * as householdsController from './households.controller.js';
import { memberParamSchema, onboardingSchema, updateHouseholdSchema } from './households.schemas.js';

export const householdsRouter = Router();

householdsRouter.use(requireAuth);
householdsRouter.get('/', householdsController.get);
// No requireHead: the caller has no household yet. The service checks "no active membership".
householdsRouter.post('/onboarding', validate({ body: onboardingSchema }), householdsController.onboarding);
householdsRouter.patch('/', requireHead, validate({ body: updateHouseholdSchema }), householdsController.update);
householdsRouter.delete(
  '/members/:userId',
  requireHead,
  validate({ params: memberParamSchema }),
  householdsController.removeMember,
);
householdsRouter.get('/invites', requireHead, invitesController.list);
householdsRouter.post('/invites', requireHead, validate({ body: createInviteSchema }), invitesController.create);
householdsRouter.post('/invites/:id/resend', requireHead, validate({ params: idParamSchema }), invitesController.resend);
householdsRouter.delete('/invites/:id', requireHead, validate({ params: idParamSchema }), invitesController.revoke);
