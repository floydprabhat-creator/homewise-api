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

## Emails in development

With `EMAIL_DRIVER=log` (the default), emails such as family invites are printed to the API log instead of being sent. Copy the invite link from there.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the API with reload on change |
| `pnpm build` / `pnpm start` | Build to `dist/` and run it |
| `pnpm typecheck` | TypeScript check |
| `pnpm db:generate` | Generate a SQL migration from `src/db/schema/` changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed local demo data |
| `pnpm job <name>` | Run a background job once: `generate-occurrences`, `carry-over-budgets`, `expire-invites` (safe to repeat) |
| `pnpm db:check` | Test the database connection |
| `pnpm db:studio` | Open Drizzle Studio |
