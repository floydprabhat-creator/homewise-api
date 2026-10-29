import { withTransaction } from '../../db/transaction.js';
import type { Role } from '../../domain/constants.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { addDays, addMonths, currentMonthIST, monthOf, monthRange, todayIST } from '../../utils/dates.js';
import { formatDay, formatINR } from '../../utils/format.js';
import * as attachmentsService from '../attachments/attachments.service.js';
import * as thresholdsService from '../budgets/thresholds.service.js';
import * as householdsRepository from '../households/households.repository.js';
import { notify } from '../notifications/notify.js';
import * as transactionsRepository from '../transactions/transactions.repository.js';
import * as transactionsService from '../transactions/transactions.service.js';
import type { ListOccurrencesQuery, PayOccurrenceInput, UpdateOccurrenceInput } from './bills.schemas.js';
import * as occurrencesRepository from './occurrences.repository.js';
import { getOccurrenceStatus } from './schedule.js';

/** The dashboard shows overdue bills plus those due within this many days. */
const DASHBOARD_DAYS_AHEAD = 14;

type Member = { userId: string; name: string; role: Role };
type OccurrenceRow = Awaited<ReturnType<typeof occurrencesRepository.list>>[number];

const notFound = () => AppError.notFound('Bill not found');

/** Adds the calculated status and the responsible person (assignee, or the head when unassigned). */
function decorate(rows: OccurrenceRow[], members: Member[], today: string) {
  const headId = members.find((m) => m.role === 'HEAD')?.userId ?? null;
  const names = new Map(members.map((m) => [m.userId, m.name]));
  return rows.map((row) => {
    const responsibleUserId = row.assigneeId ?? headId;
    return {
      ...row,
      displayStatus: getOccurrenceStatus(row, row.bill.remindDaysBefore, today),
      responsibleUserId,
      responsibleName: (responsibleUserId && names.get(responsibleUserId)) ?? 'Former member',
      isAssignedToHead: row.assigneeId === null || row.assigneeId === headId,
    };
  });
}

async function listDecorated(householdId: string, filters: occurrencesRepository.OccurrenceFilters) {
  const [rows, members] = await Promise.all([
    occurrencesRepository.list(householdId, filters),
    householdsRepository.listActiveMembers(householdId),
  ]);
  return decorate(rows, members, todayIST());
}

async function findDecorated(householdId: string, id: string) {
  const [item] = await listDecorated(householdId, { id });
  return item;
}

async function findOrThrow(auth: AuthContext, id: string) {
  // Scoped by householdId: another household's occurrence is a 404.
  const occurrence = await occurrencesRepository.findById(auth.householdId, id);
  if (!occurrence) throw notFound();
  return occurrence;
}

/** Paid dates follow the spending rule: from the 1st of last month (IST) up to today. */
function assertPaidAtAllowed(date: string) {
  if (date > todayIST()) {
    throw AppError.badRequest("Payment date can't be in the future", { paidAt: "Date can't be in the future" });
  }
  if (date < `${addMonths(currentMonthIST(), -1)}-01`) {
    throw AppError.badRequest('Payments can go back to the start of last month', { paidAt: 'Too far in the past' });
  }
}

export async function list(auth: AuthContext, query: ListOccurrencesQuery) {
  return { items: await listDecorated(auth.householdId, query) };
}

/** Current month: overdue + due within 14 days. Any other month: that month's occurrences with their final status (F8). */
export function listForDashboard(auth: AuthContext, month: string) {
  if (month === currentMonthIST()) {
    return listDecorated(auth.householdId, { status: 'UNPAID', to: addDays(todayIST(), DASHBOARD_DAYS_AHEAD) });
  }
  const { start, end } = monthRange(month);
  return listDecorated(auth.householdId, { from: start, to: addDays(end, -1) });
}

export async function update(auth: AuthContext, id: string, input: UpdateOccurrenceInput) {
  const occurrence = await findOrThrow(auth, id);
  if (occurrence.status === 'PAID') {
    throw AppError.conflict('This bill is already paid. Undo the payment to change it.');
  }
  if (input.assigneeId) {
    if (!(await householdsRepository.isActiveMember(auth.householdId, input.assigneeId))) {
      throw AppError.badRequest('Pick a current member of your household', { assigneeId: 'Not a household member' });
    }
  }

  await occurrencesRepository.update(auth.householdId, id, input);

  const newAssignee = input.assigneeId;
  if (newAssignee && newAssignee !== occurrence.assigneeId && newAssignee !== auth.userId) {
    await notify({
      householdId: auth.householdId,
      userId: newAssignee,
      type: 'BILL_ASSIGNED',
      title: `You're paying ${occurrence.bill.name}`,
      body: `${formatINR(input.amountDue ?? occurrence.amountDue)}, due ${formatDay(occurrence.dueDate)}.`,
      link: '/bills',
      dedupeKey: `bill_assigned:${id}:${newAssignee}`,
      email: false,
    });
  }
  return findDecorated(auth.householdId, id);
}

export async function pay(auth: AuthContext, id: string, input: PayOccurrenceInput, files: Express.Multer.File[] = []) {
  const occurrence = await findOrThrow(auth, id);
  if (occurrence.status === 'PAID') throw new AppError(409, 'ALREADY_PAID', 'This bill is already marked paid');

  const headId = await householdsRepository.findHeadId(auth.householdId);
  const responsibleId = occurrence.assigneeId ?? headId;
  if (auth.role !== 'HEAD' && auth.userId !== responsibleId) {
    throw AppError.forbidden('Only the person responsible or the head can mark this bill paid');
  }

  assertPaidAtAllowed(input.paidAt);
  const checked = await attachmentsService.checkFiles(files);

  const transactionId = await withTransaction(async (tx) => {
    // Only flips an UNPAID row, so a second payer racing this one gets a 409 and nothing is counted twice.
    const marked = await occurrencesRepository.markPaid(
      id,
      { paidAmount: input.paidAmount, paidAt: input.paidAt, paidBy: auth.userId },
      tx,
    );
    if (!marked) throw new AppError(409, 'ALREADY_PAID', 'This bill is already marked paid');

    const entry = await transactionsService.createFromBill(
      {
        householdId: auth.householdId,
        recordedBy: auth.userId,
        amount: input.paidAmount,
        date: input.paidAt,
        categoryId: occurrence.bill.categoryId,
        note: occurrence.bill.name,
        billOccurrenceId: id,
      },
      tx,
    );
    // A member paying tells the head; it rolls back with the payment.
    if (auth.role !== 'HEAD' && headId) {
      await notify(
        {
          householdId: auth.householdId,
          userId: headId,
          type: 'BILL_PAID',
          title: `${occurrence.bill.name} was paid`,
          body: `${formatINR(input.paidAmount)} paid on ${formatDay(input.paidAt)}.`,
          link: '/bills',
          dedupeKey: `bill_paid:${id}`,
          email: false,
        },
        tx,
      );
    }
    return entry.id;
  });

  // Files are stored after commit; a failed upload is reported, not rolled back.
  const { failed } = await attachmentsService.storeFiles(auth, transactionId, checked);
  await thresholdsService.checkAfterChange(auth.householdId, monthOf(input.paidAt));

  return { occurrence: await findDecorated(auth.householdId, id), failedFiles: failed };
}

/** Head only: removes the linked spending entry and its files, and the occurrence is unpaid again. */
export async function unpay(auth: AuthContext, id: string) {
  const occurrence = await findOrThrow(auth, id);
  if (occurrence.status !== 'PAID') throw AppError.conflict('This bill is not marked paid');

  const entry = await transactionsRepository.findByOccurrence(auth.householdId, id);
  const keys = entry ? await attachmentsService.listStorageKeys(auth.householdId, entry.id) : [];

  await withTransaction(async (tx) => {
    if (entry) await transactionsRepository.remove(auth.householdId, entry.id, tx);
    await occurrencesRepository.markUnpaid(id, tx);
  });

  await attachmentsService.deleteKeys(keys);
  if (entry) await thresholdsService.checkAfterChange(auth.householdId, monthOf(entry.date));

  return { occurrence: await findDecorated(auth.householdId, id) };
}
