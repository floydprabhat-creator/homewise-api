import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export type Email = { to: string; subject: string; html: string; text: string };

/** No send may hold up a request for long: a blocked or unreachable mail server fails within seconds. */
const TIMEOUT_MS = 10_000;

// Port 465 is TLS from the start; 587 upgrades with STARTTLS.
const smtp =
  env.EMAIL_DRIVER === 'smtp'
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS * 2,
      })
    : null;

/** "HomeWise <a@b.com>" → { name, email }; a bare address has no name. */
function parseAddress(value: string) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return match ? { name: match[1] || undefined, email: match[2]! } : { email: value.trim() };
}

async function sendWithBrevo(email: Email) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseAddress(env.EMAIL_FROM),
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Brevo ${response.status}: ${body?.message ?? response.statusText}`);
  }
}

/**
 * Sends through Brevo's API (HTTPS) or SMTP (Nodemailer), or with EMAIL_DRIVER=log prints the email
 * instead, so invite links can be copied from the API log in development. Throws on failure.
 */
export async function sendEmail(email: Email) {
  if (env.EMAIL_DRIVER === 'brevo') return sendWithBrevo(email);
  if (smtp) {
    await smtp.sendMail({ from: env.EMAIL_FROM, ...email });
    return;
  }
  logger.info({ to: email.to, subject: email.subject }, `Email (not sent, EMAIL_DRIVER=log):\n${email.text}`);
}
