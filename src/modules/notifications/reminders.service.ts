import { logger } from '../../lib/logger.js';
import type { Role } from '../../shared/constants.js';
import { addDays } from '../../utils/dates.js';
import { formatDay, formatINR } from '../../utils/format.js';
import * as occurrencesRepository from '../bills/occurrences.repository.js';
import * as householdsRepository from '../households/households.repository.js';
import { notify } from './notify.js';

type Member = { userId: string; name: string; role: Role };

/**
 * The bill rules, applied to every unpaid occurrence once a day (F9 table):
 * - reminder: today ≥ due − remind days → the responsible person
 * - escalation: today ≥ due − 1 and the responsible person isn't the head → the head
 * - overdue: today ≥ due + 1 → the responsible person and the head
 * An overdue bill only gets the overdue notice, so a late first run doesn't send all three at once.
 * Dedupe keys make repeated runs harmless; reassigning sends the new person their own reminder.
 */
export async function run(today: string) {
  const occurrences = await occurrencesRepository.listForReminders(today);
  const membersOf = new Map<string, Member[]>();
  let checked = 0;

  for (const occ of occurrences) {
    let members = membersOf.get(occ.householdId);
    if (!members) {
      members = await householdsRepository.listActiveMembers(occ.householdId);
      membersOf.set(occ.householdId, members);
    }
    const head = members.find((m) => m.role === 'HEAD');
    if (!head) continue;
    const responsible = members.find((m) => m.userId === occ.assigneeId) ?? head;

    const amount = formatINR(occ.amountDue);
    const due = formatDay(occ.dueDate);
    const who = `${responsible.name} is responsible for paying it.`;
    const base = { householdId: occ.householdId, link: '/bills', email: true };
    checked += 1;

    if (today >= addDays(occ.dueDate, 1)) {
      const recipients = new Set([responsible.userId, head.userId]);
      for (const userId of recipients) {
        await notify({
          ...base,
          userId,
          type: 'BILL_OVERDUE',
          title: `${occ.billName} is overdue`,
          body: `${amount} was due ${due}. ${who}`,
          dedupeKey: `bill_overdue:${occ.id}:${userId}`,
        });
      }
      continue;
    }

    await notify({
      ...base,
      userId: responsible.userId,
      type: 'BILL_REMINDER',
      title: occ.dueDate === today ? `${occ.billName} is due today` : `${occ.billName} is due ${due}`,
      body: `${amount} due ${due}. ${who}`,
      dedupeKey: `bill_reminder:${occ.id}:${responsible.userId}`,
    });

    if (responsible.userId !== head.userId && today >= addDays(occ.dueDate, -1)) {
      await notify({
        ...base,
        userId: head.userId,
        type: 'BILL_ESCALATION',
        title: `${occ.billName} is still unpaid`,
        body: `${amount} due ${due}. ${who}`,
        dedupeKey: `bill_escalation:${occ.id}`,
      });
    }
  }

  logger.info({ today, checked }, 'Bill reminders finished');
  return { checked };
}
