import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  /** The web app, for links in emails. */
  APP_URL: z.url().default('http://localhost:3000'),
  /**
   * 'log' prints emails instead of sending them. Defaults to 'smtp' when SMTP_USER is set, else
   * 'resend' when RESEND_API_KEY is set, else 'log'.
   */
  EMAIL_DRIVER: z.enum(['log', 'resend', 'smtp']).optional(),
  RESEND_API_KEY: z.string().optional(),
  /** SMTP via Nodemailer; the defaults are Gmail's (sign in with an App Password, not the account password). */
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Without it: "HomeWise <SMTP_USER>" for SMTP, Resend's test sender for Resend. */
  EMAIL_FROM: z.string().optional(),
  /** Guards POST /internal/jobs/:name/run. Without it the endpoint refuses every call. */
  CRON_SECRET: z.string().min(16).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // 'cloudinary' arrives with production credentials.
  STORAGE_DRIVER: z.enum(['local']).default('local'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

const data = parsed.data;
const emailDriver = data.EMAIL_DRIVER ?? (data.SMTP_USER ? 'smtp' : data.RESEND_API_KEY ? 'resend' : 'log');
if (emailDriver === 'resend' && !data.RESEND_API_KEY) {
  console.error('EMAIL_DRIVER=resend needs RESEND_API_KEY');
  process.exit(1);
}
if (emailDriver === 'smtp' && !(data.SMTP_USER && data.SMTP_PASS)) {
  console.error('EMAIL_DRIVER=smtp needs SMTP_USER and SMTP_PASS');
  process.exit(1);
}
const emailFrom =
  data.EMAIL_FROM ?? (emailDriver === 'smtp' ? `HomeWise <${data.SMTP_USER}>` : 'HomeWise <onboarding@resend.dev>');

export const env = { ...data, EMAIL_DRIVER: emailDriver, EMAIL_FROM: emailFrom };
export const isProduction = env.NODE_ENV === 'production';
