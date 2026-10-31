import { logger } from '../lib/logger.js';
import { billRemindersJob } from './bill-reminders.job.js';
import { carryOverBudgetsJob } from './carry-over-budgets.job.js';
import { expireInvitesJob } from './expire-invites.job.js';
import { generateOccurrencesJob } from './generate-occurrences.job.js';
import { sendEmailsJob } from './send-emails.job.js';

const STEPS = [
  ['expire-invites', expireInvitesJob],
  ['carry-over-budgets', carryOverBudgetsJob],
  ['generate-occurrences', generateOccurrencesJob],
  ['bill-reminders', billRemindersJob],
  ['send-emails', sendEmailsJob],
] as const;

/**
 * 08:00 IST. The steps run in this order (occurrences exist before reminders look at them, and the
 * emails they queue go out at the end). A failing
 * step is logged and the rest still run; every step is idempotent, so the whole job can be re-run.
 */
export async function dailyJob(today: string) {
  const results: Record<string, unknown> = {};
  for (const [name, step] of STEPS) {
    try {
      results[name] = await step(today);
      logger.info({ job: name, today, result: results[name] }, 'Daily step finished');
    } catch (err) {
      results[name] = { error: err instanceof Error ? err.message : String(err) };
      logger.error({ err, job: name, today }, 'Daily step failed');
    }
  }
  return results;
}
