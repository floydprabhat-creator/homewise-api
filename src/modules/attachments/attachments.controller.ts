import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as attachmentsService from './attachments.service.js';

export async function signedUrl(req: Request, res: Response) {
  res.json(await attachmentsService.getSignedUrl(getAuth(req), res.locals.params.id));
}

export async function remove(req: Request, res: Response) {
  await attachmentsService.remove(getAuth(req), res.locals.params.id);
  res.status(204).end();
}
