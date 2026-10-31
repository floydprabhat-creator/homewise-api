import type { Request, Response } from 'express';
import { clearSessionCookie, setSessionCookie } from '../../lib/session-cookie.js';
import { getSession } from '../../utils/auth.js';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response) {
  const session = await authService.register(req.body);
  setSessionCookie(res, session.user.id);
  res.status(201).json(session);
}

export async function login(req: Request, res: Response) {
  const session = await authService.login(req.body);
  setSessionCookie(res, session.user.id);
  res.status(200).json(session);
}

export async function sendPasswordResetCode(req: Request, res: Response) {
  res.json(await authService.sendPasswordResetCode(req.body));
}

/** Issued after the change, so every older session is signed out and this one is fresh. */
export async function resetPassword(req: Request, res: Response) {
  const session = await authService.resetPassword(req.body);
  setSessionCookie(res, session.user.id);
  res.status(200).json(session);
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const session = await authService.getSessionContext(getSession(req).userId);
  res.status(200).json(session);
}
