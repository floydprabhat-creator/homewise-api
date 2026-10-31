import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { LOGIN_RATE_LIMIT, PASSWORD_RESET_RATE_LIMIT, REGISTER_RATE_LIMIT } from '../config/constants.js';

const tooManyAttempts = {
  error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in a few minutes.' },
};

const ipAndEmail = (req: Request) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
};

/** 5 failed attempts per 15 minutes for the same IP + email; the 6th gets 429. Successful logins don't count. */
export const loginRateLimit = rateLimit({
  ...LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: ipAndEmail,
  message: tooManyAttempts,
});

/** Forgot password: code requests and reset attempts together, 10 per 15 minutes for the same IP + email. */
export const passwordResetRateLimit = rateLimit({
  ...PASSWORD_RESET_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: ipAndEmail,
  message: tooManyAttempts,
});

export const registerRateLimit = rateLimit({
  ...REGISTER_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: tooManyAttempts,
});
