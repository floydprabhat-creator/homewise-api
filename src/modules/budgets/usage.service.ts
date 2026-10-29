import { db } from '../../db/index.js';
import type { DbClient } from '../../db/types.js';
import { monthRange } from '../../utils/dates.js';
import * as occurrencesRepository from '../bills/occurrences.repository.js';
import * as budgetsRepository from './budgets.repository.js';
import { computeUsage } from './usage.js';
import * as usageRepository from './usage.repository.js';

/** Every usage figure for a month. The dashboard, budget page and spending-form preview all read this. */
export async function getBudgetUsage(householdId: string, month: string, client: DbClient = db) {
  const { start, end } = monthRange(month);
  const budget = await budgetsRepository.findByMonth(householdId, month, client);
  const targetIds = budget?.targets.map((t) => t.categoryId) ?? [];

  const [total, byBucket, byTargetCategory, committed] = await Promise.all([
    usageRepository.sumTotal(householdId, start, end, client),
    usageRepository.sumByBucket(householdId, start, end, client),
    usageRepository.sumByCategory(householdId, start, end, targetIds, client),
    occurrencesRepository.sumUnpaidDueInMonth(householdId, month, client),
  ]);

  return computeUsage(month, budget ?? null, { total, byBucket, byTargetCategory }, committed);
}
