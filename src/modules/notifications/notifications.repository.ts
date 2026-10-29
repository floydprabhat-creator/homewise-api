import { and, count, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';
import { pageToOffset } from '../../utils/pagination.js';

export const MAX_EMAIL_ATTEMPTS = 3;

/** Inserts unless a notification with the same dedupe key exists. */
export async function insertIgnoreDuplicate(data: typeof notifications.$inferInsert, client: DbClient = db) {
  await client.insert(notifications).values(data).onConflictDoNothing({ target: notifications.dedupeKey });
}

/** Always scoped by userId: a user only ever sees their own notifications. */
export function listForUser(userId: string, { unreadOnly, page }: { unreadOnly: boolean; page: number }) {
  const { limit, offset } = pageToOffset(page);
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), unreadOnly ? isNull(notifications.readAt) : undefined))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countUnread(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

export async function markRead(userId: string, id: string) {
  const rows = await db
    .update(notifications)
    .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
    .returning({ id: notifications.id });
  return rows.length > 0;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/**
 * Outbox: PENDING emails with attempts left, locked for this transaction. SKIP LOCKED means a second
 * sender running at the same time takes other rows (or none), so nothing is sent twice.
 */
export function claimPendingEmails(limit: number, tx: DbClient) {
  return tx
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      emailAttempts: notifications.emailAttempts,
      email: users.email,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .where(and(eq(notifications.emailStatus, 'PENDING'), lt(notifications.emailAttempts, MAX_EMAIL_ATTEMPTS)))
    .orderBy(notifications.createdAt)
    .limit(limit)
    .for('update', { skipLocked: true, of: notifications });
}

export async function markEmailSent(ids: string[], tx: DbClient) {
  if (ids.length === 0) return;
  await tx.update(notifications).set({ emailStatus: 'SENT' }).where(inArray(notifications.id, ids));
}

/** A failed attempt: counted, and FAILED once the last attempt is used up. */
export async function recordEmailFailure(ids: string[], tx: DbClient) {
  if (ids.length === 0) return;
  await tx
    .update(notifications)
    .set({
      emailAttempts: sql`${notifications.emailAttempts} + 1`,
      emailStatus: sql`case when ${notifications.emailAttempts} + 1 >= ${MAX_EMAIL_ATTEMPTS} then 'FAILED'::email_status else 'PENDING'::email_status end`,
    })
    .where(inArray(notifications.id, ids));
}
