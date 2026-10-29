import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as billsService from './bills.service.js';

export async function list(req: Request, res: Response) {
  res.json({ bills: await billsService.list(getAuth(req), res.locals.query) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ bill: await billsService.create(getAuth(req), req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ bill: await billsService.update(getAuth(req), res.locals.params.id, req.body) });
}

/** 200 with { result: 'deleted' | 'archived' }, so the client can say which happened. */
export async function remove(req: Request, res: Response) {
  res.json(await billsService.remove(getAuth(req), res.locals.params.id));
}
