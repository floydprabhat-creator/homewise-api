import type { Request, Response } from 'express';
import { getSession } from '../../utils/auth.js';
import * as notificationsService from './notifications.service.js';

// getSession: notifications belong to the user, and a removed member can still read theirs.
export async function list(req: Request, res: Response) {
  res.json(await notificationsService.list(getSession(req).userId, res.locals.query));
}

export async function markRead(req: Request, res: Response) {
  await notificationsService.markRead(getSession(req).userId, res.locals.params.id);
  res.status(204).end();
}

export async function markAllRead(req: Request, res: Response) {
  await notificationsService.markAllRead(getSession(req).userId);
  res.status(204).end();
}
