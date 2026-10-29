import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/require-auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import * as usersController from './users.controller.js';
import { changePasswordSchema, updateProfileSchema, userParamSchema } from './users.schemas.js';

/** 10 failed password attempts per 15 minutes per user, so a borrowed session can't guess the current password. */
const passwordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? 'anonymous',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in a few minutes.' } },
});

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.patch('/me', validate({ body: updateProfileSchema }), usersController.updateProfile);
usersRouter.put('/me/avatar', upload.single('avatar'), usersController.setAvatar);
usersRouter.delete('/me/avatar', usersController.removeAvatar);
usersRouter.post('/me/password-code', usersController.sendPasswordCode);
usersRouter.post('/me/password', passwordRateLimit, validate({ body: changePasswordSchema }), usersController.changePassword);
usersRouter.get('/:id/avatar', validate({ params: userParamSchema }), usersController.avatar);
