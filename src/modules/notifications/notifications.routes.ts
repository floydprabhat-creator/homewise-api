import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../shared/common.schemas.js';
import * as notificationsController from './notifications.controller.js';
import { listNotificationsQuerySchema } from './notifications.schemas.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', validate({ query: listNotificationsQuerySchema }), notificationsController.list);
// Before /:id, so "read-all" isn't read as an id.
notificationsRouter.post('/read-all', notificationsController.markAllRead);
notificationsRouter.post('/:id/read', validate({ params: idParamSchema }), notificationsController.markRead);
