import { db } from '../../db/index.js';
import { notifications } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

/** Inserts unless a notification with the same dedupe key exists. */
export async function insertIgnoreDuplicate(data: typeof notifications.$inferInsert, client: DbClient = db) {
  await client.insert(notifications).values(data).onConflictDoNothing({ target: notifications.dedupeKey });
}
