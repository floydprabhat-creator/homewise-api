import type { Request, Response } from 'express';
import { getAuth, getSession } from '../../utils/auth.js';
import * as householdsService from './households.service.js';
import * as membersService from './members.service.js';

export async function get(req: Request, res: Response) {
  res.json(await householdsService.get(getAuth(req)));
}

export async function onboarding(req: Request, res: Response) {
  const session = await householdsService.onboarding(getSession(req).userId, req.body);
  res.status(201).json(session);
}

export async function update(req: Request, res: Response) {
  res.json({ household: await householdsService.update(getAuth(req), req.body) });
}

export async function removeMember(req: Request, res: Response) {
  await membersService.remove(getAuth(req), res.locals.params.userId);
  res.status(204).end();
}
