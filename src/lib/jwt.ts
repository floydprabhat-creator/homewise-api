import jwt from 'jsonwebtoken';
import { SESSION_TTL_DAYS } from '../config/constants.js';
import { env } from '../config/env.js';

type SessionPayload = { sub: string };

export function signSessionToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${SESSION_TTL_DAYS}d`,
    algorithm: 'HS256',
  });
}

/** Returns the user ID, or null when the token is invalid or expired. */
export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
