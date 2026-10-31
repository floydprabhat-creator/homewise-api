import jwt from 'jsonwebtoken';
import { SESSION_TTL_DAYS } from '../config/constants.js';
import { env } from '../config/env.js';

/** `iat` is in seconds; `iatMs` (tokens issued since it was added) is the same moment in milliseconds. */
type SessionPayload = { sub: string; iat: number; iatMs?: number };

export function signSessionToken(userId: string): string {
  return jwt.sign({ iatMs: Date.now() }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${SESSION_TTL_DAYS}d`,
    algorithm: 'HS256',
  });
}

/**
 * The user ID and when the token was issued, in milliseconds (older tokens without `iatMs` fall back
 * to the start of their issuing second), or null when it's invalid or expired.
 */
export function verifySessionToken(token: string): { userId: string; issuedAtMs: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
    if (typeof payload.sub !== 'string') return null;
    return { userId: payload.sub, issuedAtMs: typeof payload.iatMs === 'number' ? payload.iatMs : payload.iat * 1000 };
  } catch {
    return null;
  }
}
