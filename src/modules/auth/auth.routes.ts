import { Router } from 'express';
import { loginRateLimit, passwordResetRateLimit, registerRateLimit } from '../../middleware/rate-limit.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import * as authController from './auth.controller.js';
import { loginSchema, passwordResetCodeSchema, registerSchema, resetPasswordSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', registerRateLimit, validate({ body: registerSchema }), authController.register);
authRouter.post('/login', loginRateLimit, validate({ body: loginSchema }), authController.login);
authRouter.post(
  '/password-reset/code',
  passwordResetRateLimit,
  validate({ body: passwordResetCodeSchema }),
  authController.sendPasswordResetCode,
);
authRouter.post('/password-reset', passwordResetRateLimit, validate({ body: resetPasswordSchema }), authController.resetPassword);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
