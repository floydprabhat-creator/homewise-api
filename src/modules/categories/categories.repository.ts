import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bills, categories, transactions } from '../../db/schema/index.js';
import { DEFAULT_CATEGORIES } from '../../db/seed-data/categories.js';
import type { DbClient } from '../../db/types.js';
import { BUCKETS, type Bucket } from '../../shared/constants.js';

const columns = {
  id: categories.id,
  name: categories.name,
  bucket: categories.bucket,
  isSystem: categories.isSystem,
  archivedAt: categories.archivedAt,
};

export async function seedDefaults(householdId: string, client: DbClient = db) {
  const rows = BUCKETS.flatMap((bucket) =>
    DEFAULT_CATEGORIES[bucket].map((name) => ({ householdId, name, bucket, isSystem: true })),
  );
  await client.insert(categories).values(rows).onConflictDoNothing();
}

export function list(householdId: string, { includeArchived }: { includeArchived: boolean }) {
  return db
    .select(columns)
    .from(categories)
    .where(and(eq(categories.householdId, householdId), includeArchived ? undefined : isNull(categories.archivedAt)))
    .orderBy(
      sql`array_position(array['ESSENTIALS','LIFESTYLE','SAVINGS']::bucket[], ${categories.bucket})`,
      asc(categories.name),
    );
}

export async function findById(householdId: string, id: string, client: DbClient = db) {
  const [row] = await client
    .select(columns)
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .limit(1);
  return row;
}

export function findByIds(householdId: string, ids: string[], client: DbClient = db) {
  if (ids.length === 0) return Promise.resolve([]);
  return client
    .select(columns)
    .from(categories)
    .where(and(eq(categories.householdId, householdId), inArray(categories.id, ids)));
}

export function findByNames(householdId: string, names: string[], client: DbClient = db) {
  return client
    .select(columns)
    .from(categories)
    .where(and(eq(categories.householdId, householdId), inArray(categories.name, names)));
}

export async function existsByName(householdId: string, name: string, excludeId?: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.householdId, householdId),
        sql`lower(${categories.name}) = lower(${name})`,
        excludeId ? ne(categories.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function create(householdId: string, data: { name: string; bucket: Bucket }) {
  const [row] = await db
    .insert(categories)
    .values({ householdId, ...data, isSystem: false })
    .returning(columns);
  return row!;
}

export async function update(
  householdId: string,
  id: string,
  data: Partial<{ name: string; bucket: Bucket; archivedAt: Date | null }>,
) {
  const [row] = await db
    .update(categories)
    .set(data)
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .returning(columns);
  return row;
}

export async function hasTransactions(householdId: string, id: string) {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.categoryId, id)))
    .limit(1);
  return Boolean(row);
}

/** Active or paused bills still create or hold payable occurrences in this category. */
export async function hasActiveBills(householdId: string, id: string) {
  const [row] = await db
    .select({ id: bills.id })
    .from(bills)
    .where(and(eq(bills.householdId, householdId), eq(bills.categoryId, id), ne(bills.status, 'ARCHIVED')))
    .limit(1);
  return Boolean(row);
}
