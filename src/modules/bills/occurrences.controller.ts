import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as occurrencesService from './occurrences.service.js';

const uploadedFiles = (req: Request) => (req.files as Express.Multer.File[] | undefined) ?? [];

export async function list(req: Request, res: Response) {
  res.json(await occurrencesService.list(getAuth(req), res.locals.query));
}

export async function update(req: Request, res: Response) {
  res.json({ occurrence: await occurrencesService.update(getAuth(req), res.locals.params.id, req.body) });
}

export async function pay(req: Request, res: Response) {
  res.json(await occurrencesService.pay(getAuth(req), res.locals.params.id, req.body, uploadedFiles(req)));
}

export async function unpay(req: Request, res: Response) {
  res.json(await occurrencesService.unpay(getAuth(req), res.locals.params.id));
}
