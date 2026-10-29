import { withTransaction } from '../../db/transaction.js';
import { logger } from '../../lib/logger.js';
import type { Frequency } from '../../shared/constants.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { addDays, todayIST } from '../../utils/dates.js';
import * as categoriesRepository from '../categories/categories.repository.js';
import * as householdsRepository from '../households/households.repository.js';
import * as billsRepository from './bills.repository.js';
import type { CreateBillInput, ListBillsQuery, UpdateBillInput } from './bills.schemas.js';
import * as occurrencesRepository from './occurrences.repository.js';
import { nextDueDate } from './schedule.js';

/** Occurrences are created until the latest due date is beyond today + this many days. */
const GENERATE_AHEAD_DAYS = 31;

async function assertCategoryUsable(householdId: string, categoryId: string) {
  const category = await categoriesRepository.findById(householdId, categoryId);
  if (!category || category.archivedAt) {
    throw AppError.badRequest('Pick an active category', { categoryId: 'Pick an active category' });
  }
}

async function assertActiveMember(householdId: string, userId: string, field: string) {
  if (!(await householdsRepository.isActiveMember(householdId, userId))) {
    throw AppError.badRequest('Pick a current member of your household', { [field]: 'Not a household member' });
  }
}

async function findOrThrow(auth: AuthContext, id: string) {
  const bill = await billsRepository.findById(auth.householdId, id);
  if (!bill) throw AppError.notFound('Bill not found');
  return bill;
}

export function list(auth: AuthContext, query: ListBillsQuery) {
  return billsRepository.list(auth.householdId, query);
}

export async function create(auth: AuthContext, input: CreateBillInput) {
  await assertCategoryUsable(auth.householdId, input.categoryId);
  if (input.defaultAssigneeId) await assertActiveMember(auth.householdId, input.defaultAssigneeId, 'defaultAssigneeId');

  const bill = await withTransaction(async (tx) => {
    const created = await billsRepository.create(
      {
        householdId: auth.householdId,
        createdBy: auth.userId,
        name: input.name,
        categoryId: input.categoryId,
        amountType: input.amountType,
        amount: input.amount,
        frequency: input.frequency,
        firstDueDate: input.firstDueDate,
        anchorDay: Number(input.firstDueDate.slice(8, 10)),
        remindDaysBefore: input.remindDaysBefore,
        defaultAssigneeId: input.defaultAssigneeId ?? null,
      },
      tx,
    );
    await occurrencesRepository.create(
      {
        householdId: auth.householdId,
        billId: created.id,
        dueDate: created.firstDueDate,
        amountDue: created.amount,
        assigneeId: created.defaultAssigneeId,
      },
      tx,
    );
    return created;
  });

  // Fill the same window the daily job keeps, so next month's occurrence shows straight away.
  await generateForBill(bill, todayIST());
  return bill;
}

/** Changes apply to occurrences created afterwards; existing ones keep their amount and payer. */
export async function update(auth: AuthContext, id: string, input: UpdateBillInput) {
  const bill = await findOrThrow(auth, id);
  if (bill.status === 'ARCHIVED') throw AppError.conflict("Archived bills can't be changed");

  if (input.categoryId && input.categoryId !== bill.categoryId) {
    await assertCategoryUsable(auth.householdId, input.categoryId);
  }
  if (input.defaultAssigneeId && input.defaultAssigneeId !== bill.defaultAssigneeId) {
    await assertActiveMember(auth.householdId, input.defaultAssigneeId, 'defaultAssigneeId');
  }

  const updated = await billsRepository.update(auth.householdId, id, input);
  if (!updated) throw AppError.notFound('Bill not found');

  // Resuming: catch up on the window the job skipped while the bill was paused.
  if (bill.status === 'PAUSED' && updated.status === 'ACTIVE') await generateForBill(updated, todayIST());
  return updated;
}

/** A bill with paid history is archived (its unpaid occurrences removed) instead of deleted. */
export async function remove(auth: AuthContext, id: string): Promise<{ result: 'deleted' | 'archived' }> {
  const bill = await findOrThrow(auth, id);

  if (await occurrencesRepository.hasPaid(bill.id)) {
    await withTransaction(async (tx) => {
      await billsRepository.archive(auth.householdId, id, tx);
      await occurrencesRepository.deleteUnpaidForBill(id, tx);
    });
    return { result: 'archived' };
  }

  await billsRepository.remove(auth.householdId, id);
  return { result: 'deleted' };
}

type GeneratableBill = {
  id: string;
  householdId: string;
  amount: string;
  frequency: Frequency;
  anchorDay: number;
  defaultAssigneeId: string | null;
};

/**
 * Creates occurrences after the bill's latest one until a due date lies beyond today + 31 days.
 * Dates already past are skipped, so a bill resumed after a pause doesn't fill up with overdue rows.
 */
async function generateForBill(bill: GeneratableBill, today: string) {
  if (bill.frequency === 'ONE_TIME') return 0;
  const latest = await occurrencesRepository.findLatestForBill(bill.id);
  if (!latest) return 0;

  const horizon = addDays(today, GENERATE_AHEAD_DAYS);
  const rows = [];
  let cursor = latest.dueDate;
  while (cursor <= horizon) {
    const next = nextDueDate(cursor, bill.frequency, bill.anchorDay);
    if (!next) break;
    if (next >= today) {
      rows.push({
        householdId: bill.householdId,
        billId: bill.id,
        dueDate: next,
        amountDue: bill.amount,
        assigneeId: bill.defaultAssigneeId,
      });
    }
    cursor = next;
  }
  return occurrencesRepository.createMany(rows);
}

/** Run by the daily job: every active recurring bill, all households. Safe to run repeatedly. */
export async function generateUpcoming(today: string) {
  const recurring = await billsRepository.listActiveRecurring();
  let created = 0;
  for (const bill of recurring) created += await generateForBill(bill, today);
  logger.info({ today, bills: recurring.length, created }, 'Bill occurrence generation finished');
  return { bills: recurring.length, created };
}
