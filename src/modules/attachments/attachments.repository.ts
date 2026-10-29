import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { attachments, transactions } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

export const publicColumns = {
  id: attachments.id,
  contentType: attachments.contentType,
  sizeBytes: attachments.sizeBytes,
  originalName: attachments.originalName,
  createdAt: attachments.createdAt,
};

export async function create(data: typeof attachments.$inferInsert, client: DbClient = db) {
  const [row] = await client.insert(attachments).values(data).returning(publicColumns);
  return row!;
}

export function listByTransaction(householdId: string, transactionId: string, client: DbClient = db) {
  return client
    .select({ ...publicColumns, storageKey: attachments.storageKey })
    .from(attachments)
    .where(and(eq(attachments.householdId, householdId), eq(attachments.transactionId, transactionId)))
    .orderBy(asc(attachments.createdAt));
}

/** The attachment with the entry it belongs to, for permission checks. */
export async function findById(householdId: string, id: string) {
  const [row] = await db
    .select({
      id: attachments.id,
      storageKey: attachments.storageKey,
      contentType: attachments.contentType,
      originalName: attachments.originalName,
      transactionId: attachments.transactionId,
      recordedBy: transactions.recordedBy,
      billOccurrenceId: transactions.billOccurrenceId,
    })
    .from(attachments)
    .innerJoin(transactions, eq(transactions.id, attachments.transactionId))
    .where(and(eq(attachments.householdId, householdId), eq(attachments.id, id)))
    .limit(1);
  return row;
}

export async function remove(householdId: string, id: string) {
  await db.delete(attachments).where(and(eq(attachments.householdId, householdId), eq(attachments.id, id)));
}

export async function countByTransaction(householdId: string, transactionId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(attachments)
    .where(and(eq(attachments.householdId, householdId), eq(attachments.transactionId, transactionId)));
  return row?.value ?? 0;
}
