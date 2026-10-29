import { BUCKETS, type Bucket } from '../../domain/constants.js';
import type { AuthContext } from '../../utils/auth.js';
import { addMonths, currentMonthIST, daysInMonth, monthRange, todayIST } from '../../utils/dates.js';
import { fromPaise, percentOf, toPaise } from '../../utils/money.js';
import * as occurrencesService from '../bills/occurrences.service.js';
import type { BudgetUsage } from '../budgets/usage.js';
import * as usageRepository from '../budgets/usage.repository.js';
import * as usageService from '../budgets/usage.service.js';
import * as transactionsRepository from '../transactions/transactions.repository.js';

const RECENT_COUNT = 5;

/** Change from `previous` to `current` in %, one decimal; null when there's nothing to compare with. */
const change = (current: number, previous: number) => (previous === 0 ? null : percentOf(current - previous, previous));

/** Essentials, Lifestyle and the overall budget at 80% / 100%; Savings never warns. */
function warningsFrom(usage: BudgetUsage) {
  const warnings: { scope: Bucket | 'OVERALL'; state: 'WARNING' | 'EXCEEDED' }[] = [];
  for (const b of usage.buckets) {
    if (b.state === 'WARNING' || b.state === 'EXCEEDED') warnings.push({ scope: b.bucket, state: b.state });
  }
  if (usage.state !== 'OK') warnings.push({ scope: 'OVERALL', state: usage.state });
  return warnings;
}

/** Every widget's data for one month, in one response. Read only; composes other modules. */
export async function getDashboard(auth: AuthContext, month: string = currentMonthIST()) {
  const { start, end } = monthRange(month);
  const previousMonth = addMonths(month, -1);
  const previous = monthRange(previousMonth);

  const [usage, byCategory, previousBuckets, bills, recentSpending] = await Promise.all([
    usageService.getBudgetUsage(auth.householdId, month),
    usageRepository.sumByCategory(auth.householdId, start, end),
    usageRepository.sumByBucket(auth.householdId, previous.start, previous.end),
    occurrencesService.listForDashboard(auth, month),
    transactionsRepository.listRecent(auth.householdId, RECENT_COUNT, month),
  ]);

  const breakdown = BUCKETS.map((bucket) => ({
    bucket,
    spent: usage.buckets.find((b) => b.bucket === bucket)?.spent ?? '0.00',
    categories: byCategory
      .filter((c) => c.bucket === bucket)
      .map((c) => ({ categoryId: c.categoryId, name: c.name, spent: c.spent })),
  }));

  const previousIn = new Map(previousBuckets.map((b) => [b.bucket, toPaise(b.spent)]));
  const previousTotal = [...previousIn.values()].reduce((sum, p) => sum + p, 0);
  const currentTotal = toPaise(usage.spent);

  const comparison =
    previousBuckets.length === 0
      ? null
      : {
          previousMonth,
          total: {
            current: usage.spent,
            previous: fromPaise(previousTotal),
            changePercent: change(currentTotal, previousTotal),
          },
          buckets: usage.buckets.map((b) => {
            const before = previousIn.get(b.bucket) ?? 0;
            return {
              bucket: b.bucket,
              current: b.spent,
              previous: fromPaise(before),
              changePercent: change(toPaise(b.spent), before),
            };
          }),
        };

  const isCurrentMonth = month === currentMonthIST();
  return {
    month,
    isCurrentMonth,
    daysLeft: isCurrentMonth ? daysInMonth(month) - Number(todayIST().slice(8, 10)) : null,
    usage,
    breakdown,
    comparison,
    bills,
    recentSpending,
    warnings: warningsFrom(usage),
  };
}
