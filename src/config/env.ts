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
  /** 'log' prints emails instead of sending them. Defaults to 'resend' when RESEND_API_KEY is set. */
  EMAIL_DRIVER: z.enum(['log', 'resend']).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('HomeWise <onboarding@resend.dev>'),
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
const emailDriver = data.EMAIL_DRIVER ?? (data.RESEND_API_KEY ? 'resend' : 'log');
if (emailDriver === 'resend' && !data.RESEND_API_KEY) {
  console.error('EMAIL_DRIVER=resend needs RESEND_API_KEY');
  process.exit(1);
}

export const env = { ...data, EMAIL_DRIVER: emailDriver };
export const isProduction = env.NODE_ENV === 'production';
