import cron from 'node-cron';
import { TIMEZONE } from '../config/constants.js';
import { logger } from '../lib/logger.js';
import { todayIST } from '../utils/dates.js';
import { jobs, type JobName } from './registry.js';

function run(name: JobName) {
  return async () => {
    try {
      await jobs[name](todayIST());
    } catch (err) {
      logger.error({ err, job: name }, 'Scheduled job failed');
    }
  };
}

/**
 * Registered when the server starts: the daily job at 08:00 IST and the email sender every 5 minutes.
 * If the host sleeps through 08:00, trigger `daily` through POST /internal/jobs/daily/run instead.
 */
export function startSchedules() {
  const tasks = [
    cron.schedule('0 8 * * *', run('daily'), { timezone: TIMEZONE, name: 'daily', noOverlap: true }),
    cron.schedule('*/5 * * * *', run('send-emails'), { timezone: TIMEZONE, name: 'send-emails', noOverlap: true }),
  ];
  logger.info('Scheduled: daily at 08:00 IST, send-emails every 5 minutes');
  return () => tasks.forEach((t) => t.stop());
}
