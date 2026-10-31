import { and, count, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { households, invites, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

const listColumns = {
  id: invites.id,
  email: invites.email,
  name: invites.name,
  status: invites.status,
  expiresAt: invites.expiresAt,
  createdAt: invites.createdAt,
  updatedAt: invites.updatedAt,
};

export async function create(data: typeof invites.$inferInsert, client: DbClient = db) {
  const [row] = await client.insert(invites).values(data).returning(listColumns);
  return row!;
}

export async function findPendingByEmail(householdId: string, email: string) {
  const [row] = await db
    .select({ id: invites.id, expiresAt: invites.expiresAt })
    .from(invites)
    .where(and(eq(invites.householdId, householdId), eq(invites.email, email), eq(invites.status, 'PENDING')))
    .limit(1);
  return row;
}

/** With the family name and inviter, for the public preview and for accepting. */
export async function findByTokenHash(hash: string, client: DbClient = db) {
  const [row] = await client
    .select({
      id: invites.id,
      householdId: invites.householdId,
      email: invites.email,
      name: invites.name,
      status: invites.status,
      expiresAt: invites.expiresAt,
      invitedBy: invites.invitedBy,
      familyName: households.name,
      householdStatus: households.status,
      inviterName: users.name,
    })
    .from(invites)
    .innerJoin(households, eq(households.id, invites.householdId))
    .innerJoin(users, eq(users.id, invites.invitedBy))
    .where(eq(invites.tokenHash, hash))
    .limit(1);
  return row;
}

/** Pending and expired invites (expired ones can be resent), newest first. */
export function listPending(householdId: string) {
  return db
    .select(listColumns)
    .from(invites)
    .where(and(eq(invites.householdId, householdId), inArray(invites.status, ['PENDING', 'EXPIRED'])))
    .orderBy(desc(invites.createdAt));
}

/** Pending invites that haven't expired yet: they hold a place under the member cap. */
export async function countPending(householdId: string, now: Date, client: DbClient = db) {
  const [row] = await client
    .select({ value: count() })
    .from(invites)
    .where(and(eq(invites.householdId, householdId), eq(invites.status, 'PENDING'), gt(invites.expiresAt, now)));
  return row?.value ?? 0;
}

export async function findById(householdId: string, id: string) {
  const [row] = await db
    .select({ id: invites.id, email: invites.email, name: invites.name, status: invites.status, expiresAt: invites.expiresAt })
    .from(invites)
    .where(and(eq(invites.householdId, householdId), eq(invites.id, id)))
    .limit(1);
  return row;
}

/** Only a PENDING row: a second tab accepting the same invite gets `undefined`. */
export async function markAccepted(id: string, userId: string, client: DbClient) {
  const [row] = await client
    .update(invites)
    .set({ status: 'ACCEPTED', acceptedBy: userId, acceptedAt: new Date() })
    .where(and(eq(invites.id, id), eq(invites.status, 'PENDING')))
    .returning({ id: invites.id });
  return row;
}

export async function revoke(householdId: string, id: string) {
  await db
    .update(invites)
    .set({ status: 'REVOKED' })
    .where(and(eq(invites.householdId, householdId), eq(invites.id, id)));
}

/** Resend: a new token and expiry; an expired invite becomes PENDING again. `name` is only set when given. */
export async function refreshToken(householdId: string, id: string, tokenHash: string, expiresAt: Date, name?: string) {
  const [row] = await db
    .update(invites)
    .set({ tokenHash, expiresAt, status: 'PENDING', ...(name !== undefined && { name }) })
    .where(and(eq(invites.householdId, householdId), eq(invites.id, id)))
    .returning(listColumns);
  return row;
}

/** Daily job: PENDING invites past their expiry become EXPIRED. */
export async function expireOld(now: Date) {
  const rows = await db
    .update(invites)
    .set({ status: 'EXPIRED' })
    .where(and(eq(invites.status, 'PENDING'), lt(invites.expiresAt, now)))
    .returning({ id: invites.id });
  return rows.length;
}
