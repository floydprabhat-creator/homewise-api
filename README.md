# homewise-api

Express 5 + TypeScript + Drizzle ORM + PostgreSQL. Architecture and folder rules: [`../requirements/folder-structure.md`](../requirements/folder-structure.md).

## Local setup

1. Start Postgres (the `house_wise` database must exist).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `JWT_SECRET` (`openssl rand -base64 48`).
3. Install and prepare the database:

   ```bash
   pnpm install
   pnpm db:migrate   # apply migrations in drizzle/
   pnpm db:seed      # create the demo account below
   pnpm dev          # http://localhost:4000
   ```

## Demo account (local development only)

Created by `pnpm db:seed`. Log in at http://localhost:3000/login with the web app running.

| Field | Value |
| --- | --- |
| Email | `demo@homewise.app` |
| Password | `password123` |
| Role | `HEAD` of the household "Demo Family" |

The seed refuses to run when `NODE_ENV=production`, and running it again leaves an existing demo user unchanged.

## Emails

With `EMAIL_DRIVER=log` (the default when neither `SMTP_USER` nor `RESEND_API_KEY` is set), emails such as family invites and bill reminders are printed to the API log instead of being sent. Copy invite links from there. To send for real, set `SMTP_USER` and `SMTP_PASS` (Gmail address + App Password; Nodemailer), or `RESEND_API_KEY` and `EMAIL_FROM` (needs a verified domain).

## Background jobs

The server schedules `daily` at 08:00 IST (expire invites → carry over budgets → generate bill occurrences → bill reminders) and `send-emails` every 5 minutes. Every job is idempotent, so running one twice changes nothing.

Run one by hand, optionally as if it were another day:

```bash
pnpm job daily 2026-11-07
```

Or over HTTP, for an external scheduler when the host sleeps through 08:00 (`date` is ignored in production):

```bash
curl -X POST http://localhost:4000/api/internal/jobs/daily/run \
  -H "x-cron-secret: $CRON_SECRET" -H 'content-type: application/json' -d '{"date":"2026-11-07"}'
```

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the API with reload on change |
| `pnpm build` / `pnpm start` | Build to `dist/` and run it |
| `pnpm typecheck` | TypeScript check |
| `pnpm db:generate` | Generate a SQL migration from `src/db/schema/` changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed local demo data |
| `pnpm job <name> [date]` | Run a job once: `daily`, `send-emails`, `expire-invites`, `carry-over-budgets`, `generate-occurrences`, `bill-reminders` |
| `pnpm db:check` | Test the database connection |
| `pnpm db:studio` | Open Drizzle Studio |
