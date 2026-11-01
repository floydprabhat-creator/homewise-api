# homewise-api

The API behind HomeWise, a household budget, spending and bills tracker for Indian families. Express 5 + TypeScript + Drizzle ORM + PostgreSQL. The web app lives in [homewise-web](https://github.com/floydprabhat-creator/homewise-web).

## What it does

- **Accounts:** sign up, log in, 7-day httpOnly session cookie, forgot password with an emailed 6-digit code, profile name, photo and password.
- **Households:** "Just me" or a family with a head and up to 10 members; email invites (optionally with the person's name), resend, revoke, remove a member.
- **Budget:** monthly amount split into Essentials, Lifestyle and Savings (with savings targets), carried over each month; 80% and 100% warnings.
- **Spending:** entries with up to 3 photo or PDF attachments, filters, search and pagination.
- **Bills:** recurring bills, per-month responsibility, mark paid (creates the spending entry) and undo.
- **Dashboard:** one call for every widget.
- **Notifications:** in-app bell plus emails for bill reminders, escalations, overdue bills and budget warnings.
- **AI (optional, Google Gemini):** read a bill photo or PDF to fill in the spending or bill form; suggest a budget split from a few questions.

## Code layout

```text
route → controller → service → repository → Drizzle / PostgreSQL
```

- `src/modules/<feature>/` holds `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` and `*.schemas.ts` (Zod). Only repositories touch Drizzle, and every query is scoped by the `householdId` from the session.
- `src/jobs/` holds the scheduled jobs; `src/lib/` holds email, AI, storage, JWT and logging; `src/db/schema/` holds the tables; `drizzle/` holds the committed SQL migrations.
- Money is `numeric(12,2)` and travels as a string; business dates use Asia/Kolkata.

## Local setup

Requires Node.js 22+ and pnpm.

1. Start PostgreSQL with a `house_wise` database.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` and `JWT_SECRET` (`openssl rand -base64 48`); everything else is optional.
3. Install and prepare the database:

   ```bash
   pnpm install
   pnpm db:migrate   # apply migrations in drizzle/
   pnpm db:seed      # create the demo account below
   pnpm dev          # http://localhost:4000
   ```

Check it's up: `GET http://localhost:4000/api/health` returns `{"status":"ok"}` when the database is reachable (503 when it isn't).

## Demo account (local development only)

Created by `pnpm db:seed`. Log in at http://localhost:3000/login with the web app running.

| Field | Value |
| --- | --- |
| Email | `demo@homewise.app` |
| Password | `password123` |
| Role | `HEAD` of the household "Demo Family" |

The seed refuses to run when `NODE_ENV=production`, and running it again leaves an existing demo user unchanged.

## Environment variables

| Variable | Needed | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ characters |
| `APP_URL` | In production | The web app's URL, used for links in emails (default `http://localhost:3000`) |
| `SMTP_USER` / `SMTP_PASS` | To send email | A Gmail address and an App Password; without them emails are printed to the log |
| `SMTP_HOST` / `SMTP_PORT` | No | Default to Gmail (`smtp.gmail.com`, `465`) |
| `EMAIL_FROM` | No | Defaults to `HomeWise <SMTP_USER>` |
| `CRON_SECRET` | For `/internal` | 16+ characters; guards the on-demand job endpoint |
| `TRUST_PROXY` | Behind a proxy | Number of proxies in front of the API, so rate limits see each visitor's IP |
| `GEMINI_API_KEY` | For AI features | From aistudio.google.com; without it the AI features are hidden |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | No | Default `gemini-3.8-flash`, then `gemini-3.5-flash` when the first is busy or slow |
| `STORAGE_DRIVER` | No | `local` (files in `uploads/`) |

## Emails

With `EMAIL_DRIVER=log` (the default when `SMTP_USER` is not set), emails such as invites, reset codes and bill reminders are printed to the API log instead of being sent, so links and codes can be copied from there. With `SMTP_USER` and `SMTP_PASS` set, Nodemailer sends through Gmail's SMTP server (about 500 emails a day on a Gmail account).

## AI features

Both use Google Gemini through `src/lib/ai/` and are switched off without `GEMINI_API_KEY`. Nothing is saved by either one: the result only fills in a form that the user checks and saves.

- **Fill in from a bill:** `POST /api/scan` reads a JPG, PNG, WebP or PDF (5 MB max) and returns the amount, dates, merchant, category, how often it repeats and a note. 50 a day per household.
- **Plan your budget with AI:** `POST /api/budgets/advice` (head only) suggests a split, savings targets and general investment ideas from 7 answers, and adjusts it on request. 30 a day per household.

Every AI answer is validated field by field before it reaches the browser. On Gemini's free tier a request can take 10–30 seconds or come back busy, and Google may use the content to improve its products, so use a paid tier for real users.

## Background jobs

The server schedules `daily` at 08:00 IST: expire invites → carry over budgets → generate bill occurrences → bill reminders → send the queued emails. Budget warnings are emailed as soon as they happen, and `send-emails` also runs hourly to retry failed sends (3 attempts). Every job is idempotent, so running one twice changes nothing.

Run one by hand, optionally as if it were another day:

```bash
pnpm job daily 2026-11-07
```

Or over HTTP, for an external scheduler when the host sleeps through 08:00 (`date` is ignored in production):

```bash
curl -X POST http://localhost:4000/api/internal/jobs/daily/run \
  -H "x-cron-secret: $CRON_SECRET" -H 'content-type: application/json' -d '{"date":"2026-11-07"}'
```

## Deploying

| Step | Command |
| --- | --- |
| Build | `pnpm install --frozen-lockfile && pnpm build` |
| Before each deploy | `node dist/db/migrate.js` |
| Start | `node dist/server.js` |
| Health check | `/api/health` |

Keep the server always on, since node-cron runs the 08:00 job in-process. Uploaded files are stored on local disk for now, so they don't survive a redeploy on hosts with ephemeral disks.

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

## Commits

Subjects start with `feat:`, `add:` or `update:`.
