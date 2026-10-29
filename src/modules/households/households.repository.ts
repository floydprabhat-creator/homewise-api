import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { householdMembers, households, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';
import type { HouseholdType, Role } from '../../domain/constants.js';

/** The user's ACTIVE membership with its household, or undefined. Used on every authenticated request. */
export async function findActiveMembership(userId: string, client: DbClient = db) {
  const [row] = await client
    .select({
      role: householdMembers.role,
      household: { id: households.id, name: households.name, type: households.type },
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, 'ACTIVE'),
        eq(households.status, 'ACTIVE'),
      ),
    )
    .limit(1);
  return row;
}

export async function create(data: { name: string; type: HouseholdType }, client: DbClient = db) {
  const [row] = await client.insert(households).values(data).returning();
  return row!;
}

export async function addMember(data: { householdId: string; userId: string; role: Role }, client: DbClient = db) {
  await client.insert(householdMembers).values({ ...data, status: 'ACTIVE' });
}

export async function findById(householdId: string) {
  const [row] = await db
    .select({ id: households.id, name: households.name, type: households.type })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  return row;
}

/** The head's user id, for bills and notifications. */
export async function findHeadId(householdId: string) {
  const [row] = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.role, 'HEAD'),
        eq(householdMembers.status, 'ACTIVE'),
      ),
    )
    .limit(1);
  return row?.userId;
}

export async function isActiveMember(householdId: string, userId: string) {
  const [row] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, 'ACTIVE'),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export function listActiveMembers(householdId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarKey: users.avatarKey,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.status, 'ACTIVE')))
    .orderBy(asc(householdMembers.joinedAt));
}

export async function countActiveMembers(householdId: string, client: DbClient = db) {
  const [row] = await client
    .select({ value: count() })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.status, 'ACTIVE')));
  return row?.value ?? 0;
}

/** The user's ACTIVE membership in this household, or undefined. */
export async function findActiveMember(householdId: string, userId: string) {
  const [row] = await db
    .select({ userId: householdMembers.userId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, 'ACTIVE'),
      ),
    )
    .limit(1);
  return row;
}

export async function update(householdId: string, data: Partial<{ name: string; type: HouseholdType }>) {
  const [row] = await db
    .update(households)
    .set(data)
    .where(eq(households.id, householdId))
    .returning({ id: households.id, name: households.name, type: households.type });
  return row;
}

export async function archive(householdId: string, client: DbClient = db) {
  await client.update(households).set({ status: 'ARCHIVED' }).where(eq(households.id, householdId));
}

/** Sets the ACTIVE membership REMOVED; their spending stays in history. Returns false when there was none. */
export async function removeMember(householdId: string, userId: string, client: DbClient = db) {
  const rows = await client
    .update(householdMembers)
    .set({ status: 'REMOVED', removedAt: sql`now()` })
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, 'ACTIVE'),
      ),
    )
    .returning({ id: householdMembers.id });
  return rows.length > 0;
}
