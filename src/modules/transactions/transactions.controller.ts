import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as transactionsService from './transactions.service.js';

const uploadedFiles = (req: Request) => (req.files as Express.Multer.File[] | undefined) ?? [];

export async function list(req: Request, res: Response) {
  res.json(await transactionsService.list(getAuth(req), res.locals.query));
}

export async function get(req: Request, res: Response) {
  res.json({ transaction: await transactionsService.get(getAuth(req), res.locals.params.id) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await transactionsService.create(getAuth(req), req.body, uploadedFiles(req)));
}

export async function update(req: Request, res: Response) {
  res.json({ transaction: await transactionsService.update(getAuth(req), res.locals.params.id, req.body) });
}

export async function remove(req: Request, res: Response) {
  await transactionsService.remove(getAuth(req), res.locals.params.id);
  res.status(204).end();
}

export async function addAttachments(req: Request, res: Response) {
  res.status(201).json(await transactionsService.addAttachments(getAuth(req), res.locals.params.id, uploadedFiles(req)));
}
