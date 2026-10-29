import { Router } from 'express';
import { filePath, verifySignature } from '../../lib/storage/local.driver.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Serves files for the local storage driver. No session check: the signed URL is the permission,
 * issued by GET /attachments/:id/url after a membership check, and it expires after 5 minutes.
 */
export const filesRouter = Router();

filesRouter.get('/*key', (req, res) => {
  const key = (req.params as { key: string[] }).key.join('/');
  const expires = Number(req.query.expires);
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';

  if (!verifySignature(key, expires, sig)) throw AppError.forbidden('This link has expired. Open the file again.');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath(key), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  });
});
