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
  /** 'log' prints emails instead of sending them. Defaults to 'smtp' when SMTP_USER is set, else 'log'. */
  EMAIL_DRIVER: z.enum(['log', 'smtp']).optional(),
  /** SMTP via Nodemailer; the defaults are Gmail's (sign in with an App Password, not the account password). */
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Without it: "HomeWise <SMTP_USER>". */
  EMAIL_FROM: z.string().optional(),
  /** Google Gemini, for reading bill photos and PDFs. Without a key the "Fill in from a bill" feature is off. */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-3.5-flash'),
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
const emailDriver = data.EMAIL_DRIVER ?? (data.SMTP_USER ? 'smtp' : 'log');
if (emailDriver === 'smtp' && !(data.SMTP_USER && data.SMTP_PASS)) {
  console.error('EMAIL_DRIVER=smtp needs SMTP_USER and SMTP_PASS');
  process.exit(1);
}
const emailFrom = data.EMAIL_FROM || `HomeWise <${data.SMTP_USER ?? 'no-reply@localhost'}>`;

export const env = { ...data, EMAIL_DRIVER: emailDriver, EMAIL_FROM: emailFrom };
export const isProduction = env.NODE_ENV === 'production';
