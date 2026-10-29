import type { DbClient } from '../../db/types.js';
import { PAGE_SIZE } from '../../config/constants.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { addMonths, currentMonthIST, monthOf, todayIST } from '../../utils/dates.js';
import * as attachmentsRepository from '../attachments/attachments.repository.js';
import * as attachmentsService from '../attachments/attachments.service.js';
import * as thresholdsService from '../budgets/thresholds.service.js';
import * as categoriesRepository from '../categories/categories.repository.js';
import * as transactionsRepository from './transactions.repository.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from './transactions.schemas.js';

const billPayment = () => new AppError(409, 'BILL_PAYMENT', 'Change this through the bill');
const notYours = () => AppError.forbidden('You can only change your own entries');

/** Allowed dates: from the 1st of the previous IST month up to today (IST). */
function assertDateAllowed(date: string) {
  if (date > todayIST()) {
    throw AppError.badRequest("Date can't be in the future", { date: "Date can't be in the future" });
  }
  const earliest = `${addMonths(currentMonthIST(), -1)}-01`;
  if (date < earliest) {
    throw AppError.badRequest('Entries can go back to the start of last month', {
      date: 'Too far in the past',
    });
  }
}

async function assertCategoryUsable(householdId: string, categoryId: string) {
  const category = await categoriesRepository.findById(householdId, categoryId);
  if (!category || category.archivedAt) {
    throw AppError.badRequest('Pick an active category', { categoryId: 'Pick an active category' });
  }
}

async function findOrThrow(auth: AuthContext, id: string) {
  // Scoped by householdId: another household's entry is a 404.
  const entry = await transactionsRepository.findById(auth.householdId, id);
  if (!entry) throw AppError.notFound('Entry not found');
  return entry;
}

export async function list(auth: AuthContext, query: ListTransactionsQuery) {
  const { page, ...rest } = query;
  const filters = { ...rest, month: rest.month ?? currentMonthIST() };
  const [items, summary] = await Promise.all([
    transactionsRepository.list(auth.householdId, filters, page),
    transactionsRepository.summarize(auth.householdId, filters),
  ]);
  return { month: filters.month, items, page, pageSize: PAGE_SIZE, total: summary.count, totalAmount: summary.total };
}

export function get(auth: AuthContext, id: string) {
  return findOrThrow(auth, id);
}

export async function create(auth: AuthContext, input: CreateTransactionInput, files: Express.Multer.File[] = []) {
  assertDateAllowed(input.date);
  await assertCategoryUsable(auth.householdId, input.categoryId);
  const checked = await attachmentsService.checkFiles(files);

  // recorded_by always comes from the session, never the request.
  const { id } = await transactionsRepository.create({
    householdId: auth.householdId,
    recordedBy: auth.userId,
    amount: input.amount,
    date: input.date,
    categoryId: input.categoryId,
    note: input.note ?? null,
  });

  const { failed } = await attachmentsService.storeFiles(auth, id, checked);
  await thresholdsService.checkAfterChange(auth.householdId, monthOf(input.date));

  return { transaction: await transactionsRepository.findById(auth.householdId, id), failedFiles: failed };
}

export async function update(auth: AuthContext, id: string, input: UpdateTransactionInput) {
  const entry = await findOrThrow(auth, id);
  if (!attachmentsService.canModify(auth, { recordedBy: entry.recordedById })) throw notYours();
  if (entry.billOccurrenceId) throw billPayment();

  if (input.date && input.date !== entry.date) assertDateAllowed(input.date);
  if (input.categoryId && input.categoryId !== entry.category.id) {
    await assertCategoryUsable(auth.householdId, input.categoryId);
  }

  await transactionsRepository.update(auth.householdId, id, input);

  // Re-check both months when the date moves the entry between months.
  const months = new Set([monthOf(entry.date), monthOf(input.date ?? entry.date)]);
  for (const month of months) await thresholdsService.checkAfterChange(auth.householdId, month);

  return transactionsRepository.findById(auth.householdId, id);
}

export async function remove(auth: AuthContext, id: string) {
  const entry = await findOrThrow(auth, id);
  if (!attachmentsService.canModify(auth, { recordedBy: entry.recordedById })) throw notYours();
  if (entry.billOccurrenceId) throw billPayment();

  await attachmentsService.deleteStoredFiles(auth.householdId, id);
  await transactionsRepository.remove(auth.householdId, id);
  await thresholdsService.checkAfterChange(auth.householdId, monthOf(entry.date));
}

export async function addAttachments(auth: AuthContext, id: string, files: Express.Multer.File[] = []) {
  const entry = await findOrThrow(auth, id);
  if (!attachmentsService.canModify(auth, { recordedBy: entry.recordedById })) throw notYours();
  if (entry.billOccurrenceId) throw billPayment();
  if (files.length === 0) throw AppError.badRequest('Choose at least one file', { files: 'Choose a file' });

  const existing = await attachmentsRepository.countByTransaction(auth.householdId, id);
  const checked = await attachmentsService.checkFiles(files, existing);
  const { failed } = await attachmentsService.storeFiles(auth, id, checked);

  return { transaction: await transactionsRepository.findById(auth.householdId, id), failedFiles: failed };
}

/** Used by F6 when a bill is paid. Skips the bill-payment rule; the caller runs the threshold check. */
export function createFromBill(
  data: { householdId: string; recordedBy: string; amount: string; date: string; categoryId: string; note: string | null; billOccurrenceId: string },
  tx: DbClient,
) {
  return transactionsRepository.create(data, tx);
}
