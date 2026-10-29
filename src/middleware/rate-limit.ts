import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT } from '../config/constants.js';

const tooManyAttempts = {
  error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in a few minutes.' },
};

/** 5 attempts per 15 minutes for the same IP + email; the 6th gets 429. */
export const loginRateLimit = rateLimit({
  ...LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
  message: tooManyAttempts,
});

export const registerRateLimit = rateLimit({
  ...REGISTER_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: tooManyAttempts,
});
