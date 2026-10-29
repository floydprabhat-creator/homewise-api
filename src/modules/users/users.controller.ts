import type { Request, Response } from 'express';
import { setSessionCookie } from '../../lib/session-cookie.js';
import { getSession } from '../../utils/auth.js';
import * as usersService from './users.service.js';

// getSession, not getAuth: anyone signed in has a profile, with or without a household.
export async function updateProfile(req: Request, res: Response) {
  res.json(await usersService.updateProfile(getSession(req).userId, req.body));
}

export async function setAvatar(req: Request, res: Response) {
  res.json(await usersService.setAvatar(getSession(req).userId, req.file));
}

export async function removeAvatar(req: Request, res: Response) {
  res.json(await usersService.removeAvatar(getSession(req).userId));
}

/** Redirects to a short-lived signed URL, so it works the same for local storage and a cloud bucket. */
export async function avatar(req: Request, res: Response) {
  const url = await usersService.avatarLocation(getSession(req), res.locals.params.id);
  // The URL carries ?v=<photo id>, so a new photo is a new URL; the signed link lasts 5 minutes.
  res.set('Cache-Control', 'private, max-age=240').redirect(302, url);
}

export async function sendPasswordCode(req: Request, res: Response) {
  res.json(await usersService.sendPasswordCode(getSession(req).userId));
}

export async function changePassword(req: Request, res: Response) {
  const { userId } = getSession(req);
  await usersService.changePassword(userId, req.body);
  // Issued after the change, so this device stays signed in while every other one is signed out.
  setSessionCookie(res, userId);
  res.status(204).end();
}
