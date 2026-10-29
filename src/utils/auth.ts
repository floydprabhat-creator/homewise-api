import type { Request } from 'express';
import type { Role } from '../shared/constants.js';
import { AppError } from './app-error.js';

/** Set by requireAuth. householdId/role are null until the user finishes onboarding. */
export type SessionAuth = {
  userId: string;
  householdId: string | null;
  role: Role | null;
};

/** Auth for household-scoped routes: always has a household. */
export type AuthContext = {
  userId: string;
  householdId: string;
  role: Role;
};

export function getSession(req: Request): SessionAuth {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export function getAuth(req: Request): AuthContext {
  const { userId, householdId, role } = getSession(req);
  if (!householdId || !role) {
    throw AppError.forbidden('Finish setting up your household first', 'ONBOARDING_REQUIRED');
  }
  return { userId, householdId, role };
}
