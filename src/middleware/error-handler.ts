import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { MAX_FILES_PER_ENTRY } from '../config/constants.js';
import { logger } from '../lib/logger.js';
import { AppError, type FieldErrors } from '../utils/app-error.js';

function zodFieldErrors(err: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Every error leaves the API as { error: { code, message, fields? } }.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields', fields: zodFieldErrors(err) },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each file must be 5 MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `You can attach up to ${MAX_FILES_PER_ENTRY} files`
          : 'The upload could not be read';
    res.status(400).json({ error: { code: 'INVALID_FILE', message, fields: { files: message } } });
    return;
  }

  // Malformed JSON body from express.json()
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Request body is not valid JSON' } });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
