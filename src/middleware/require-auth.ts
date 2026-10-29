import type { RequestHandler } from 'express';
import { SESSION_COOKIE } from '../config/constants.js';
import { verifySessionToken } from '../lib/jwt.js';
import { clearSessionCookie } from '../lib/session-cookie.js';
import * as authService from '../modules/auth/auth.service.js';
import { AppError } from '../utils/app-error.js';

/**
 * Verifies the session cookie and loads the user's ACTIVE membership from the database on every
 * request, so a removed member loses access immediately. A user without a household (not yet
 * onboarded) still passes; household-scoped controllers use getAuth(req), which rejects them.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) throw AppError.unauthorized();

  const verified = verifySessionToken(token);
  const session = verified ? await authService.resolveSession(verified.userId, verified.issuedAt) : null;
  if (!session) {
    clearSessionCookie(res);
    throw AppError.unauthorized('Your session has expired. Please log in again.');
  }

  req.auth = session;
  next();
};
