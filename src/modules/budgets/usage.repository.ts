import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, transactions } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

// `from` inclusive, `to` exclusive: the 1st of the month and the 1st of the next (utils/dates.monthRange()).
const inRange = (householdId: string, from: string, to: string) =>
  and(eq(transactions.householdId, householdId), gte(transactions.date, from), lt(transactions.date, to));

const total = sql<string>`coalesce(sum(${transactions.amount}), 0)::numeric(12,2)::text`;

/** Spent per bucket; buckets without spending are missing from the result. */
export function sumByBucket(householdId: string, from: string, to: string, client: DbClient = db) {
  return client
    .select({ bucket: categories.bucket, spent: total })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(inRange(householdId, from, to))
    .groupBy(categories.bucket);
}

/** Spent per category, largest first. Pass `categoryIds` to limit it to savings targets. */
export function sumByCategory(
  householdId: string,
  from: string,
  to: string,
  categoryIds?: string[],
  client: DbClient = db,
) {
  if (categoryIds && categoryIds.length === 0) return Promise.resolve([]);
  return client
    .select({ categoryId: categories.id, name: categories.name, bucket: categories.bucket, spent: total })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(inRange(householdId, from, to), categoryIds ? inArray(categories.id, categoryIds) : undefined))
    .groupBy(categories.id, categories.name, categories.bucket)
    .orderBy(desc(sql`sum(${transactions.amount})`), categories.name);
}

export async function sumTotal(householdId: string, from: string, to: string, client: DbClient = db) {
  const [row] = await client.select({ spent: total }).from(transactions).where(inRange(householdId, from, to));
  return row?.spent ?? '0.00';
}
