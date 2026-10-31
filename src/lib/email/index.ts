import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export type Email = { to: string; subject: string; html: string; text: string };

// Port 465 is TLS from the start; 587 upgrades with STARTTLS.
const smtp =
  env.EMAIL_DRIVER === 'smtp'
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

/**
 * Sends through SMTP (Nodemailer), or with EMAIL_DRIVER=log (the default without SMTP_USER) prints
 * the email instead, so invite links can be copied from the API log in development. Throws on failure.
 */
export async function sendEmail(email: Email) {
  if (!smtp) {
    logger.info({ to: email.to, subject: email.subject }, `Email (not sent, EMAIL_DRIVER=log):\n${email.text}`);
    return;
  }
  await smtp.sendMail({ from: env.EMAIL_FROM, ...email });
}
