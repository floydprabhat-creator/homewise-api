import { carryOverBudgetsJob } from './carry-over-budgets.job.js';
import { expireInvitesJob } from './expire-invites.job.js';
import { generateOccurrencesJob } from './generate-occurrences.job.js';

/** Job name → function. Used by `pnpm job <name>`; F9 adds the daily schedule and the /internal endpoint. */
export const jobs = {
  'expire-invites': expireInvitesJob,
  'carry-over-budgets': carryOverBudgetsJob,
  'generate-occurrences': generateOccurrencesJob,
} as const;

export type JobName = keyof typeof jobs;

export const isJobName = (name: string): name is JobName => Object.hasOwn(jobs, name);
