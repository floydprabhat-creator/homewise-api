import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as categoriesService from './categories.service.js';

export async function list(req: Request, res: Response) {
  const categories = await categoriesService.list(getAuth(req), res.locals.query);
  res.json({ categories });
}

export async function create(req: Request, res: Response) {
  const category = await categoriesService.create(getAuth(req), req.body);
  res.status(201).json({ category });
}

export async function update(req: Request, res: Response) {
  const category = await categoriesService.update(getAuth(req), res.locals.params.id, req.body);
  res.json({ category });
}
