import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { passwordCodes } from '../../db/schema/index.js';

export async function create(data: { userId: string; codeHash: string; expiresAt: Date }) {
  await db.insert(passwordCodes).values(data);
}

/** The most recent code, for the one-per-minute limit. */
export async function findLatest(userId: string) {
  const [row] = await db
    .select({ createdAt: passwordCodes.createdAt })
    .from(passwordCodes)
    .where(eq(passwordCodes.userId, userId))
    .orderBy(desc(passwordCodes.createdAt))
    .limit(1);
  return row;
}

/** The newest code that is unused and not expired; only it can be used. */
export async function findUsable(userId: string, now: Date) {
  const [row] = await db
    .select({ id: passwordCodes.id, codeHash: passwordCodes.codeHash, attempts: passwordCodes.attempts })
    .from(passwordCodes)
    .where(and(eq(passwordCodes.userId, userId), isNull(passwordCodes.usedAt), gt(passwordCodes.expiresAt, now)))
    .orderBy(desc(passwordCodes.createdAt))
    .limit(1);
  return row;
}

export async function recordAttempt(id: string) {
  await db
    .update(passwordCodes)
    .set({ attempts: sql`${passwordCodes.attempts} + 1` })
    .where(eq(passwordCodes.id, id));
}

/** Only an unused code: the same code can't be used twice. */
export async function markUsed(id: string) {
  const rows = await db
    .update(passwordCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordCodes.id, id), isNull(passwordCodes.usedAt)))
    .returning({ id: passwordCodes.id });
  return rows.length > 0;
}
