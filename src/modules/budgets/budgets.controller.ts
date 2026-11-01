import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as adviceService from './advice.service.js';
import * as budgetsService from './budgets.service.js';

export function recommendation(_req: Request, res: Response) {
  res.json(budgetsService.getRecommendation());
}

export async function getByMonth(req: Request, res: Response) {
  res.json(await budgetsService.getByMonth(getAuth(req), res.locals.params.month));
}

export async function upsert(req: Request, res: Response) {
  const budget = await budgetsService.upsert(getAuth(req), res.locals.params.month, req.body);
  res.json({ budget });
}

export async function advice(req: Request, res: Response) {
  res.json(await adviceService.suggest(getAuth(req), req.body));
}
