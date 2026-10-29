import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';
import { getAuth } from '../utils/auth.js';

/** 403 unless the user is the HEAD of their household. Runs after requireAuth. */
export const requireHead: RequestHandler = (req, _res, next) => {
  if (getAuth(req).role !== 'HEAD') {
    throw AppError.forbidden('Only the head of the household can do this');
  }
  next();
};
