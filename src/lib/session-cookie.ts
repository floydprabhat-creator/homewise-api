import type { CookieOptions, Response } from 'express';
import { SESSION_COOKIE, SESSION_TTL_MS } from '../config/constants.js';
import { isProduction } from '../config/env.js';
import { signSessionToken } from './jwt.js';

const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

export function setSessionCookie(res: Response, userId: string) {
  res.cookie(SESSION_COOKIE, signSessionToken(userId), { ...baseOptions, maxAge: SESSION_TTL_MS });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, baseOptions);
}
