import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

export const db = drizzle({ client: pool, schema });

/** For the health check: throws when Postgres can't be reached. */
export async function pingDb() {
  await db.execute(sql`select 1`);
}

export async function closeDb() {
  await pool.end();
}
