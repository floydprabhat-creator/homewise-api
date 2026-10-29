import { withTransaction } from '../../db/transaction.js';
import type { DbClient } from '../../db/types.js';
import { logger } from '../../lib/logger.js';
import { BUCKETS } from '../../shared/constants.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { currentMonthIST } from '../../utils/dates.js';
import { toHundredths } from '../../utils/money.js';
import * as categoriesRepository from '../categories/categories.repository.js';
import * as budgetsRepository from './budgets.repository.js';
import type { UpsertBudgetInput } from './budgets.schemas.js';
import { RECOMMENDED_SPLIT } from './recommendation.js';
import * as thresholdsService from './thresholds.service.js';

export function getRecommendation() {
  return RECOMMENDED_SPLIT;
}

export async function getByMonth(auth: AuthContext, month: string) {
  const budget = await budgetsRepository.findByMonth(auth.householdId, month);
  // F7 adds `usage` from usage.service.getBudgetUsage().
  return { month, budget: budget ?? null, usage: null };
}

/** Rejects past months, unknown or archived target categories, and targets that overflow their bucket. */
async function assertValid(householdId: string, month: string, input: UpsertBudgetInput, client: DbClient) {
  if (month < currentMonthIST()) {
    throw new AppError(409, 'PAST_MONTH', "Budgets for past months can't be changed");
  }

  const ids = input.targets.map((t) => t.categoryId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest('Each category can have only one target', { targets: 'Duplicate category' });
  }

  const found = await categoriesRepository.findByIds(householdId, ids, client);
  const byId = new Map(found.map((c) => [c.id, c]));
  const used = Object.fromEntries(BUCKETS.map((b) => [b, 0]));

  for (const target of input.targets) {
    const category = byId.get(target.categoryId);
    if (!category || category.archivedAt) {
      throw AppError.badRequest('A target uses a category that is not available', { targets: 'Unknown category' });
    }
    used[category.bucket]! += toHundredths(target.percent);
  }

  for (const bucket of BUCKETS) {
    if (used[bucket]! > toHundredths(input.allocations[bucket])) {
      const name = bucket.charAt(0) + bucket.slice(1).toLowerCase();
      throw AppError.badRequest(`${name} targets add up to more than the ${name} share`, {
        targets: `Targets exceed the ${name} share`,
      });
    }
  }
}

export async function upsert(auth: AuthContext, month: string, input: UpsertBudgetInput, client?: DbClient) {
  const save = async (tx: DbClient) => {
    await assertValid(auth.householdId, month, input, tx);
    await budgetsRepository.upsert(
      auth.householdId,
      month,
      { totalAmount: input.totalAmount, allocations: input.allocations, targets: input.targets, updatedBy: auth.userId },
      tx,
    );
  };

  if (client) {
    // Part of a larger transaction (onboarding); the caller reads the result after commit.
    await save(client);
    return;
  }

  await withTransaction(save);
  await thresholdsService.checkAfterChange(auth.householdId, month);
  return budgetsRepository.findByMonth(auth.householdId, month);
}

/**
 * For each household without a budget in `month`, copy its latest earlier budget.
 * Run by the daily job on the 1st (F9 schedules it and notifies the head).
 */
export async function carryOver(month: string) {
  const householdIds = await budgetsRepository.listHouseholdsWithoutBudget(month);
  let created = 0;

  for (const householdId of householdIds) {
    const previous = await budgetsRepository.findLatestBefore(householdId, month);
    if (!previous) continue;

    const inserted = await withTransaction((tx) =>
      budgetsRepository.insertIfMissing(
        householdId,
        month,
        {
          totalAmount: previous.totalAmount,
          allocations: previous.allocations,
          targets: previous.targets.map((t) => ({ categoryId: t.categoryId, percent: t.percent })),
          updatedBy: null,
        },
        tx,
      ),
    );
    if (inserted) created += 1;
    // F9: notify the head that this month's budget was carried over.
  }

  logger.info({ month, created }, 'Budget carry-over finished');
  return { created };
}
