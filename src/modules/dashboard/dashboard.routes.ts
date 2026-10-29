import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import * as dashboardController from './dashboard.controller.js';
import { dashboardQuerySchema } from './dashboard.schemas.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/', validate({ query: dashboardQuerySchema }), dashboardController.get);
