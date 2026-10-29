import { billRemindersJob } from './bill-reminders.job.js';
import { carryOverBudgetsJob } from './carry-over-budgets.job.js';
import { dailyJob } from './daily.job.js';
import { expireInvitesJob } from './expire-invites.job.js';
import { generateOccurrencesJob } from './generate-occurrences.job.js';
import { sendEmailsJob } from './send-emails.job.js';

/**
 * Job name → function, used by the schedules, `pnpm job <name>` and POST /internal/jobs/:name/run.
 * Every job takes `today` (IST, YYYY-MM-DD) instead of reading the clock, so days can be replayed.
 */
export const jobs = {
  daily: dailyJob,
  'send-emails': sendEmailsJob,
  'expire-invites': expireInvitesJob,
  'carry-over-budgets': carryOverBudgetsJob,
  'generate-occurrences': generateOccurrencesJob,
  'bill-reminders': billRemindersJob,
} as const;

export type JobName = keyof typeof jobs;
export const JOB_NAMES = Object.keys(jobs) as [JobName, ...JobName[]];

export const isJobName = (name: string): name is JobName => Object.hasOwn(jobs, name);
