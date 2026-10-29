import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export type Email = { to: string; subject: string; html: string; text: string };

const resend = env.EMAIL_DRIVER === 'resend' ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Sends through Resend, or with EMAIL_DRIVER=log (the default without RESEND_API_KEY) prints the
 * email instead, so invite links can be copied from the API log in development. Throws on failure.
 */
export async function sendEmail(email: Email) {
  if (!resend) {
    logger.info({ to: email.to, subject: email.subject }, `Email (not sent, EMAIL_DRIVER=log):\n${email.text}`);
    return;
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...email });
  if (error) throw new Error(`Resend: ${error.message}`);
}
