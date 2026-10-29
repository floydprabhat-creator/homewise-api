import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as dashboardService from './dashboard.service.js';

export async function get(req: Request, res: Response) {
  res.json(await dashboardService.getDashboard(getAuth(req), res.locals.query.month));
}
