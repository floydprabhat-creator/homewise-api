import { sql } from 'drizzle-orm';
import { closeDb, db } from './index.js';

const result = await db.execute(sql`select current_database() as db, version() as version`);
console.log('Connected:', result.rows[0]);
await closeDb();
