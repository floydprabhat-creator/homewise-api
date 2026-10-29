import jwt from 'jsonwebtoken';
import { SESSION_TTL_DAYS } from '../config/constants.js';
import { env } from '../config/env.js';

type SessionPayload = { sub: string; iat: number };

export function signSessionToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${SESSION_TTL_DAYS}d`,
    algorithm: 'HS256',
  });
}

/** The user ID and when the token was issued (seconds), or null when it's invalid or expired. */
export function verifySessionToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
    return typeof payload.sub === 'string' ? { userId: payload.sub, issuedAt: payload.iat } : null;
  } catch {
    return null;
  }
}
