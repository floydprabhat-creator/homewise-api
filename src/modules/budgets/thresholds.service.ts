import { logger } from '../../lib/logger.js';
import type { Bucket } from '../../domain/constants.js';
import { formatINR, monthName } from '../../utils/format.js';
import * as householdsRepository from '../households/households.repository.js';
import { notify } from '../notifications/notify.js';
import type { BudgetUsage, LimitState } from './usage.js';
import * as usageService from './usage.service.js';

const BUCKET_NAMES: Record<Bucket, string> = { ESSENTIALS: 'Essentials', LIFESTYLE: 'Lifestyle', SAVINGS: 'Savings' };

type Crossing = { scope: string; state: Exclude<LimitState, 'OK'>; title: string; body: string };

/** Essentials, Lifestyle and the overall budget against 80% / 100%. */
function limitCrossings(usage: BudgetUsage): Crossing[] {
  const month = monthName(usage.month);
  const crossings: Crossing[] = [];

  for (const b of usage.buckets) {
    if (b.bucket === 'SAVINGS' || b.state === 'OK' || b.state === 'TARGET_REACHED') continue;
    const name = BUCKET_NAMES[b.bucket];
    const left = Number(b.limit) - Number(b.spent);
    crossings.push(
      b.state === 'EXCEEDED'
        ? { scope: b.bucket.toLowerCase(), state: 'EXCEEDED', title: `${name} is over its quota`, body: `${name} is over by ${formatINR(-left)} for ${month}.` }
        : { scope: b.bucket.toLowerCase(), state: 'WARNING', title: `${name} is at ${Math.floor(b.percentOfQuota ?? 0)}% of its quota`, body: `${formatINR(left)} left in ${name} for ${month}.` },
    );
  }

  if (usage.state !== 'OK' && usage.remaining !== null) {
    const left = Number(usage.remaining);
    crossings.push(
      usage.state === 'EXCEEDED'
        ? { scope: 'overall', state: 'EXCEEDED', title: `Over budget for ${month}`, body: `Spending is ${formatINR(-left)} over the ${formatINR(usage.totalBudget!)} budget.` }
        : { scope: 'overall', state: 'WARNING', title: `${Math.floor(usage.percentUsed ?? 0)}% of the ${month} budget used`, body: `${formatINR(left)} left of ${formatINR(usage.totalBudget!)}.` },
    );
  }
  return crossings;
}

/**
 * After any change that moves the month's figures (spending, a bill payment or undo, a budget update):
 * announce every threshold the month has reached. Rather than comparing before and after, each
 * crossing has a per-month dedupe key, so it's sent once and edits or deletes need no extra logic.
 * A failure is logged, never thrown: the change itself has already been saved.
 */
export async function checkAfterChange(householdId: string, month: string): Promise<void> {
  try {
    const usage = await usageService.getBudgetUsage(householdId, month);
    if (usage.totalBudget === null) return;

    const members = await householdsRepository.listActiveMembers(householdId);
    const head = members.find((m) => m.role === 'HEAD');

    for (const c of limitCrossings(usage)) {
      const threshold = c.state === 'EXCEEDED' ? 100 : 80;
      for (const m of members) {
        await notify({
          householdId,
          userId: m.userId,
          type: c.state === 'EXCEEDED' ? 'BUDGET_EXCEEDED' : 'BUDGET_WARNING',
          title: c.title,
          body: c.body,
          link: `/dashboard?month=${month}`,
          dedupeKey: `budget:${householdId}:${month}:${c.scope}:${threshold}:${m.userId}`,
          // The head is emailed; members see it in the app.
          email: m.role === 'HEAD',
        });
      }
    }

    if (!head) return;
    const savings = usage.buckets.find((b) => b.bucket === 'SAVINGS');
    const reached = [
      ...(savings?.state === 'TARGET_REACHED'
        ? [{ scope: 'share', title: `Savings reached its ${savings.percentAllocated}% share`, spent: savings.spent }]
        : []),
      ...usage.targets
        .filter((t) => t.reached)
        .map((t) => ({ scope: `target:${t.categoryId}`, title: `${t.categoryName} reached its ${t.targetPercent}% target`, spent: t.spent })),
    ];
    for (const r of reached) {
      await notify({
        householdId,
        userId: head.userId,
        type: 'SAVINGS_TARGET_REACHED',
        title: r.title,
        body: `${formatINR(r.spent)} set aside in ${monthName(month)}.`,
        link: `/budget`,
        dedupeKey: `savings:${householdId}:${month}:${r.scope}`,
        email: false,
      });
    }
  } catch (err) {
    logger.error({ err, householdId, month }, 'Budget threshold check failed');
  }
}
