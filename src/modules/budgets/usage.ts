import { BUCKETS, type Bucket } from '../../domain/constants.js';
import { fromPaise, percentOf, toPaise } from '../../utils/money.js';

/** Pure usage maths: no database, so it can be unit-tested with plain objects. */

const WARNING_PERCENT = 80;
const EXCEEDED_PERCENT = 100;

type BucketState = 'OK' | 'WARNING' | 'EXCEEDED' | 'TARGET_REACHED';
export type LimitState = 'OK' | 'WARNING' | 'EXCEEDED';

type UsageBudget = {
  totalAmount: string;
  allocations: Record<Bucket, number>;
  targets: { categoryId: string; name: string; percent: number }[];
} | null;

type UsageSums = {
  total: string;
  byBucket: { bucket: Bucket; spent: string }[];
  byTargetCategory: { categoryId: string; spent: string }[];
};

export type BudgetUsage = {
  month: string;
  totalBudget: string | null;
  spent: string;
  remaining: string | null;
  committed: string;
  /** Unpaid occurrences due this month that make up `committed`. */
  committedCount: number;
  available: string | null;
  percentUsed: number | null;
  /** The overall budget's state against 80% / 100%. */
  state: LimitState;
  buckets: {
    bucket: Bucket;
    percentAllocated: number;
    limit: string;
    spent: string;
    /** Null when the limit is 0 (or no budget is set). */
    percentOfQuota: number | null;
    state: BucketState;
  }[];
  targets: {
    categoryId: string;
    categoryName: string;
    targetPercent: number;
    actualPercent: number;
    spent: string;
    reached: boolean;
  }[];
};

function limitState(spent: number, limit: number): LimitState {
  if (limit === 0) return spent > 0 ? 'EXCEEDED' : 'OK';
  const percent = (spent * 100) / limit;
  if (percent >= EXCEEDED_PERCENT) return 'EXCEEDED';
  if (percent >= WARNING_PERCENT) return 'WARNING';
  return 'OK';
}

export function computeUsage(
  month: string,
  budget: UsageBudget,
  sums: UsageSums,
  committed: { total: string; count: number },
): BudgetUsage {
  const spent = toPaise(sums.total);
  const committedPaise = toPaise(committed.total);
  const budgetPaise = budget ? toPaise(budget.totalAmount) : null;
  const spentIn = new Map(sums.byBucket.map((b) => [b.bucket, toPaise(b.spent)]));
  const targetSpent = new Map(sums.byTargetCategory.map((c) => [c.categoryId, toPaise(c.spent)]));

  const buckets = BUCKETS.map((bucket) => {
    const bucketSpent = spentIn.get(bucket) ?? 0;
    if (budgetPaise === null || !budget) {
      return { bucket, percentAllocated: 0, limit: '0.00', spent: fromPaise(bucketSpent), percentOfQuota: null, state: 'OK' as const };
    }
    const percentAllocated = budget.allocations[bucket];
    const limit = Math.round((budgetPaise * percentAllocated) / 100);
    const percentOfQuota = percentOf(bucketSpent, limit);
    // Savings is never a warning: reaching its share is good news.
    const state: BucketState =
      bucket === 'SAVINGS'
        ? limit > 0 && bucketSpent >= limit
          ? 'TARGET_REACHED'
          : 'OK'
        : limitState(bucketSpent, limit);
    return { bucket, percentAllocated, limit: fromPaise(limit), spent: fromPaise(bucketSpent), percentOfQuota, state };
  });

  const targets = (budget?.targets ?? []).map((t) => {
    const targetPaise = targetSpent.get(t.categoryId) ?? 0;
    const actualPercent = budgetPaise ? (percentOf(targetPaise, budgetPaise) ?? 0) : 0;
    return {
      categoryId: t.categoryId,
      categoryName: t.name,
      targetPercent: t.percent,
      actualPercent,
      spent: fromPaise(targetPaise),
      // Compared in paise, not via the rounded percentage.
      reached: t.percent > 0 && budgetPaise !== null && targetPaise * 100 >= budgetPaise * t.percent,
    };
  });

  const remaining = budgetPaise === null ? null : budgetPaise - spent;

  return {
    month,
    totalBudget: budgetPaise === null ? null : fromPaise(budgetPaise),
    spent: fromPaise(spent),
    remaining: remaining === null ? null : fromPaise(remaining),
    committed: fromPaise(committedPaise),
    committedCount: committed.count,
    available: remaining === null ? null : fromPaise(remaining - committedPaise),
    percentUsed: budgetPaise === null ? null : percentOf(spent, budgetPaise),
    state: budgetPaise === null ? 'OK' : limitState(spent, budgetPaise),
    buckets,
    targets,
  };
}
