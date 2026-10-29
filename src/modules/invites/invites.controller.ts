import type { Request, Response } from 'express';
import { getAuth, getSession } from '../../utils/auth.js';
import * as invitesService from './invites.service.js';

export async function list(req: Request, res: Response) {
  res.json({ invites: await invitesService.list(getAuth(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ invite: await invitesService.create(getAuth(req), req.body) });
}

export async function resend(req: Request, res: Response) {
  res.json({ invite: await invitesService.resend(getAuth(req), res.locals.params.id) });
}

export async function revoke(req: Request, res: Response) {
  await invitesService.revoke(getAuth(req), res.locals.params.id);
  res.status(204).end();
}

export async function preview(_req: Request, res: Response) {
  res.json(await invitesService.preview(res.locals.params.token));
}

/** getSession, not getAuth: someone without a household can accept. */
export async function accept(req: Request, res: Response) {
  const { userId } = getSession(req);
  await invitesService.accept(userId, res.locals.params.token, req.body);
  res.status(204).end();
}
