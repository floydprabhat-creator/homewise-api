import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import * as householdsController from './households.controller.js';
import { onboardingSchema } from './households.schemas.js';

export const householdsRouter = Router();

householdsRouter.use(requireAuth);
householdsRouter.get('/', householdsController.get);
// No requireHead: the caller has no household yet. The service checks "no active membership".
householdsRouter.post('/onboarding', validate({ body: onboardingSchema }), householdsController.onboarding);
