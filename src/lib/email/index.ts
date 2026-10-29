import { logger } from '../logger.js';

export type Email = { to: string; subject: string; html: string; text: string };

/**
 * EMAIL_DRIVER=log (the only driver until F9 adds Resend) prints the email instead of sending it,
 * so invite links can be copied from the API log in development.
 */
export async function sendEmail(email: Email) {
  logger.info({ to: email.to, subject: email.subject }, `Email (not sent, EMAIL_DRIVER=log):\n${email.text}`);
}
