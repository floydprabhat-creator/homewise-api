import { withTransaction } from '../../db/transaction.js';
import { sendEmail, type Email } from '../../lib/email/index.js';
import { billsEmail } from '../../lib/email/templates/bills.js';
import { noticeEmail } from '../../lib/email/templates/notice.js';
import { logger } from '../../lib/logger.js';
import type { NotificationType } from '../../shared/constants.js';
import * as notificationsRepository from './notifications.repository.js';

const BATCH_SIZE = 100;
const BILL_TYPES: NotificationType[] = ['BILL_REMINDER', 'BILL_ESCALATION', 'BILL_OVERDUE'];

type Pending = Awaited<ReturnType<typeof notificationsRepository.claimPendingEmails>>[number];

/** One email per user for all their bill notifications; every other notification gets its own. */
function compose(rows: Pending[]) {
  const byUser = new Map<string, Pending[]>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  const outgoing: { email: Email; ids: string[] }[] = [];
  for (const userRows of byUser.values()) {
    const to = userRows[0]!.email;
    const bills = userRows.filter((r) => BILL_TYPES.includes(r.type));
    if (bills.length > 0) outgoing.push({ email: billsEmail(to, bills), ids: bills.map((r) => r.id) });
    for (const r of userRows.filter((x) => !BILL_TYPES.includes(x.type))) {
      outgoing.push({ email: noticeEmail(to, r), ids: [r.id] });
    }
  }
  return outgoing;
}

/**
 * The outbox sender (every 5 minutes). Claims pending rows with SKIP LOCKED inside one transaction,
 * sends, then marks them SENT, or counts the attempt and leaves them for the next run (FAILED after 3).
 */
export async function sendPending() {
  return withTransaction(async (tx) => {
    const rows = await notificationsRepository.claimPendingEmails(BATCH_SIZE, tx);
    const sent: string[] = [];
    const failed: string[] = [];

    for (const { email, ids } of compose(rows)) {
      try {
        await sendEmail(email);
        sent.push(...ids);
      } catch (err) {
        failed.push(...ids);
        const lastAttempt = rows.some(
          (r) => ids.includes(r.id) && r.emailAttempts + 1 >= notificationsRepository.MAX_EMAIL_ATTEMPTS,
        );
        logger.error({ err, to: email.to, ids, gaveUp: lastAttempt }, lastAttempt ? 'Email failed for the last time' : 'Email failed; will retry');
      }
    }

    await notificationsRepository.markEmailSent(sent, tx);
    await notificationsRepository.recordEmailFailure(failed, tx);
    return { claimed: rows.length, sent: sent.length, failed: failed.length };
  });
}
