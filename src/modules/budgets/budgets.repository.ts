import { and, desc, eq, lt, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.js';
import { budgetAllocations, categories, categoryTargets, households, monthlyBudgets } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';
import { BUCKETS, type Bucket } from '../../domain/constants.js';

type BudgetData = {
  totalAmount: string;
  allocations: Record<Bucket, number>;
  targets: { categoryId: string; percent: number }[];
  updatedBy: string | null;
};

async function loadDetails(budget: typeof monthlyBudgets.$inferSelect, client: DbClient) {
  const [allocationRows, targetRows] = await Promise.all([
    client
      .select({ bucket: budgetAllocations.bucket, percent: budgetAllocations.percent })
      .from(budgetAllocations)
      .where(eq(budgetAllocations.budgetId, budget.id)),
    client
      .select({
        categoryId: categoryTargets.categoryId,
        percent: categoryTargets.percent,
        name: categories.name,
        bucket: categories.bucket,
      })
      .from(categoryTargets)
      .innerJoin(categories, eq(categories.id, categoryTargets.categoryId))
      .where(eq(categoryTargets.budgetId, budget.id))
      .orderBy(desc(categoryTargets.percent)),
  ]);

  const allocations = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  for (const row of allocationRows) allocations[row.bucket] = Number(row.percent);

  return {
    id: budget.id,
    month: budget.month,
    totalAmount: budget.totalAmount,
    allocations,
    targets: targetRows.map((t) => ({ ...t, percent: Number(t.percent) })),
    updatedAt: budget.updatedAt,
  };
}

export async function findByMonth(householdId: string, month: string, client: DbClient = db) {
  const [budget] = await client
    .select()
    .from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.householdId, householdId), eq(monthlyBudgets.month, month)))
    .limit(1);
  return budget ? loadDetails(budget, client) : undefined;
}

export async function findLatestBefore(householdId: string, month: string, client: DbClient = db) {
  const [budget] = await client
    .select()
    .from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.householdId, householdId), lt(monthlyBudgets.month, month)))
    .orderBy(desc(monthlyBudgets.month))
    .limit(1);
  return budget ? loadDetails(budget, client) : undefined;
}

async function replaceDetails(budgetId: string, data: BudgetData, client: DbClient) {
  await client.delete(budgetAllocations).where(eq(budgetAllocations.budgetId, budgetId));
  await client.delete(categoryTargets).where(eq(categoryTargets.budgetId, budgetId));
  await client
    .insert(budgetAllocations)
    .values(BUCKETS.map((bucket) => ({ budgetId, bucket, percent: String(data.allocations[bucket]) })));
  if (data.targets.length > 0) {
    await client
      .insert(categoryTargets)
      .values(data.targets.map((t) => ({ budgetId, categoryId: t.categoryId, percent: String(t.percent) })));
  }
}

/** Insert or update the month's budget and replace its allocations and targets. Run inside a transaction. */
export async function upsert(householdId: string, month: string, data: BudgetData, client: DbClient) {
  const [budget] = await client
    .insert(monthlyBudgets)
    .values({ householdId, month, totalAmount: data.totalAmount, updatedBy: data.updatedBy })
    .onConflictDoUpdate({
      target: [monthlyBudgets.householdId, monthlyBudgets.month],
      set: { totalAmount: data.totalAmount, updatedBy: data.updatedBy, updatedAt: sql`now()` },
    })
    .returning({ id: monthlyBudgets.id });
  await replaceDetails(budget!.id, data, client);
  return budget!.id;
}

/** Carry-over insert: does nothing when the month already has a budget, so the job is idempotent. */
export async function insertIfMissing(householdId: string, month: string, data: BudgetData, client: DbClient) {
  const [budget] = await client
    .insert(monthlyBudgets)
    .values({ householdId, month, totalAmount: data.totalAmount, updatedBy: data.updatedBy })
    .onConflictDoNothing()
    .returning({ id: monthlyBudgets.id });
  if (!budget) return false;
  await replaceDetails(budget.id, data, client);
  return true;
}

/** Active households that had a budget before `month` but have none for it. */
export async function listHouseholdsWithoutBudget(month: string) {
  const current = alias(monthlyBudgets, 'current');
  const rows = await db
    .selectDistinct({ householdId: monthlyBudgets.householdId })
    .from(monthlyBudgets)
    .innerJoin(households, eq(households.id, monthlyBudgets.householdId))
    .where(
      and(
        eq(households.status, 'ACTIVE'),
        lt(monthlyBudgets.month, month),
        notExists(
          db
            .select({ id: current.id })
            .from(current)
            .where(and(eq(current.householdId, monthlyBudgets.householdId), eq(current.month, month))),
        ),
      ),
    );
  return rows.map((r) => r.householdId);
}
