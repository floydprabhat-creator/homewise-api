import type { Request, Response } from 'express';
import { getAuth, getSession } from '../../utils/auth.js';
import * as householdsService from './households.service.js';

export async function get(req: Request, res: Response) {
  res.json(await householdsService.get(getAuth(req)));
}

export async function onboarding(req: Request, res: Response) {
  const session = await householdsService.onboarding(getSession(req).userId, req.body);
  res.status(201).json(session);
}
