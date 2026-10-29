import { and, asc, desc, eq, gte, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.js';
import { attachments, billOccurrences, bills, categories, transactions, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';
import type { OccurrenceStatus } from '../../shared/constants.js';
import { monthRange } from '../../utils/dates.js';

type NewOccurrence = typeof billOccurrences.$inferInsert;

export async function create(data: NewOccurrence, client: DbClient = db) {
  const [row] = await client.insert(billOccurrences).values(data).onConflictDoNothing().returning();
  return row;
}

/** Inserts what's missing; `unique(bill_id, due_date)` makes repeated runs harmless. Returns how many were new. */
export async function createMany(rows: NewOccurrence[], client: DbClient = db) {
  if (rows.length === 0) return 0;
  const inserted = await client
    .insert(billOccurrences)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: billOccurrences.id });
  return inserted.length;
}

export async function findById(householdId: string, id: string, client: DbClient = db) {
  const [row] = await client
    .select({
      id: billOccurrences.id,
      dueDate: billOccurrences.dueDate,
      amountDue: billOccurrences.amountDue,
      assigneeId: billOccurrences.assigneeId,
      status: billOccurrences.status,
      paidAt: billOccurrences.paidAt,
      bill: {
        id: bills.id,
        name: bills.name,
        categoryId: bills.categoryId,
        remindDaysBefore: bills.remindDaysBefore,
      },
    })
    .from(billOccurrences)
    .innerJoin(bills, eq(bills.id, billOccurrences.billId))
    .where(and(eq(billOccurrences.householdId, householdId), eq(billOccurrences.id, id)))
    .limit(1);
  return row;
}

export type OccurrenceFilters = {
  from?: string;
  to?: string;
  status?: OccurrenceStatus;
  includeOverdue?: boolean;
  billId?: string;
  /** Internal: a single row in the list shape. */
  id?: string;
};

const payer = alias(users, 'payer');

/** Occurrences with their bill, category, payer and linked spending entry, ordered by due date. */
export function list(householdId: string, f: OccurrenceFilters) {
  const inRange = and(f.from ? gte(billOccurrences.dueDate, f.from) : undefined, f.to ? lte(billOccurrences.dueDate, f.to) : undefined);
  const overdue = f.from ? and(eq(billOccurrences.status, 'UNPAID'), lt(billOccurrences.dueDate, f.from)) : undefined;

  const conditions: (SQL | undefined)[] = [
    eq(billOccurrences.householdId, householdId),
    f.includeOverdue && overdue ? or(inRange, overdue) : inRange,
    f.status ? eq(billOccurrences.status, f.status) : undefined,
    f.billId ? eq(billOccurrences.billId, f.billId) : undefined,
    f.id ? eq(billOccurrences.id, f.id) : undefined,
  ];

  return db
    .select({
      id: billOccurrences.id,
      dueDate: billOccurrences.dueDate,
      amountDue: billOccurrences.amountDue,
      assigneeId: billOccurrences.assigneeId,
      status: billOccurrences.status,
      paidAmount: billOccurrences.paidAmount,
      paidAt: billOccurrences.paidAt,
      paidBy: { id: payer.id, name: payer.name },
      bill: {
        id: bills.id,
        name: bills.name,
        frequency: bills.frequency,
        amountType: bills.amountType,
        remindDaysBefore: bills.remindDaysBefore,
        status: bills.status,
      },
      category: { id: categories.id, name: categories.name, bucket: categories.bucket },
      transactionId: transactions.id,
      receiptCount: sql<number>`(select count(*) from ${attachments} where ${attachments.transactionId} = ${transactions.id})`.mapWith(Number),
    })
    .from(billOccurrences)
    .innerJoin(bills, eq(bills.id, billOccurrences.billId))
    .innerJoin(categories, eq(categories.id, bills.categoryId))
    .leftJoin(payer, eq(payer.id, billOccurrences.paidBy))
    .leftJoin(transactions, eq(transactions.billOccurrenceId, billOccurrences.id))
    .where(and(...conditions))
    .orderBy(asc(billOccurrences.dueDate), asc(bills.name));
}

export async function findLatestForBill(billId: string, client: DbClient = db) {
  const [row] = await client
    .select({ dueDate: billOccurrences.dueDate })
    .from(billOccurrences)
    .where(eq(billOccurrences.billId, billId))
    .orderBy(desc(billOccurrences.dueDate))
    .limit(1);
  return row;
}

export async function update(
  householdId: string,
  id: string,
  data: Partial<Pick<NewOccurrence, 'amountDue' | 'assigneeId'>>,
) {
  await db
    .update(billOccurrences)
    .set(data)
    .where(and(eq(billOccurrences.householdId, householdId), eq(billOccurrences.id, id)));
}

/** Only flips an UNPAID row: a concurrent second payment gets `undefined` and nothing is double-counted. */
export async function markPaid(
  id: string,
  data: { paidAmount: string; paidAt: string; paidBy: string },
  client: DbClient,
) {
  const [row] = await client
    .update(billOccurrences)
    .set({ ...data, status: 'PAID' })
    .where(and(eq(billOccurrences.id, id), eq(billOccurrences.status, 'UNPAID')))
    .returning({ id: billOccurrences.id });
  return row;
}

export async function markUnpaid(id: string, client: DbClient) {
  await client
    .update(billOccurrences)
    .set({ status: 'UNPAID', paidAmount: null, paidAt: null, paidBy: null })
    .where(eq(billOccurrences.id, id));
}

export async function hasPaid(billId: string) {
  const [row] = await db
    .select({ id: billOccurrences.id })
    .from(billOccurrences)
    .where(and(eq(billOccurrences.billId, billId), eq(billOccurrences.status, 'PAID')))
    .limit(1);
  return Boolean(row);
}

/** When a bill is archived, its unpaid occurrences go too, so they stop reminding. */
export async function deleteUnpaidForBill(billId: string, client: DbClient) {
  await client
    .delete(billOccurrences)
    .where(and(eq(billOccurrences.billId, billId), eq(billOccurrences.status, 'UNPAID')));
}

/** Member removal (F2): their unpaid occurrences fall back to the head. */
export async function clearAssigneeForUser(householdId: string, userId: string, client: DbClient = db) {
  await client
    .update(billOccurrences)
    .set({ assigneeId: null })
    .where(
      and(
        eq(billOccurrences.householdId, householdId),
        eq(billOccurrences.assigneeId, userId),
        eq(billOccurrences.status, 'UNPAID'),
      ),
    );
}

/** "Committed" (F7): unpaid occurrences due in the month, summed in SQL. */
export async function sumUnpaidDueInMonth(householdId: string, month: string, client: DbClient = db) {
  const { start, end } = monthRange(month);
  const [row] = await client
    .select({
      total: sql<string>`coalesce(sum(${billOccurrences.amountDue}), 0)::numeric(12,2)::text`,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(billOccurrences)
    .where(
      and(
        eq(billOccurrences.householdId, householdId),
        eq(billOccurrences.status, 'UNPAID'),
        gte(billOccurrences.dueDate, start),
        lt(billOccurrences.dueDate, end),
      ),
    );
  return row ?? { total: '0.00', count: 0 };
}
