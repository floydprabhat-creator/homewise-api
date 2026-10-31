import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export type Email = { to: string; subject: string; html: string; text: string };

const resend = env.EMAIL_DRIVER === 'resend' ? new Resend(env.RESEND_API_KEY) : null;

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
 * Sends through SMTP (Nodemailer) or Resend, or with EMAIL_DRIVER=log (the default without either)
 * prints the email instead, so invite links can be copied from the API log in development. Throws on failure.
 */
export async function sendEmail(email: Email) {
  if (smtp) {
    await smtp.sendMail({ from: env.EMAIL_FROM, ...email });
    return;
  }
  if (!resend) {
    logger.info({ to: email.to, subject: email.subject }, `Email (not sent, EMAIL_DRIVER=log):\n${email.text}`);
    return;
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...email });
  if (error) throw new Error(`Resend: ${error.message}`);
}
