import type { Request, Response } from 'express';
import { getAuth } from '../../utils/auth.js';
import * as scanService from './scan.service.js';

export function status(_req: Request, res: Response) {
  res.json(scanService.status());
}

export async function scan(req: Request, res: Response) {
  res.json(await scanService.scanBill(getAuth(req), req.file));
}
