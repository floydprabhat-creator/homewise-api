import { and, desc, eq, exists, gte, ilike, isNotNull, lt, not, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { attachments, categories, householdMembers, transactions, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';
import { monthRange } from '../../utils/dates.js';
import { pageToOffset } from '../../utils/pagination.js';
import * as attachmentsRepository from '../attachments/attachments.repository.js';
import type { TransactionFilters } from './transactions.schemas.js';

// ilike treats % and _ as wildcards; search for them literally.
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

function conditions(householdId: string, f: TransactionFilters): SQL[] {
  const { start, end } = monthRange(f.month);
  const hasFile = exists(
    db.select({ id: attachments.id }).from(attachments).where(eq(attachments.transactionId, transactions.id)),
  );
  const list: (SQL | undefined)[] = [
    eq(transactions.householdId, householdId),
    gte(transactions.date, start),
    lt(transactions.date, end),
    f.bucket ? eq(categories.bucket, f.bucket) : undefined,
    f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
    f.recordedBy ? eq(transactions.recordedBy, f.recordedBy) : undefined,
    f.hasAttachment === undefined ? undefined : f.hasAttachment ? hasFile : not(hasFile),
    f.q ? or(ilike(transactions.note, `%${escapeLike(f.q)}%`), ilike(categories.name, `%${escapeLike(f.q)}%`)) : undefined,
  ];
  return list.filter((c): c is SQL => c !== undefined);
}

const entryColumns = {
  id: transactions.id,
  amount: transactions.amount,
  date: transactions.date,
  note: transactions.note,
  isBillPayment: isNotNull(transactions.billOccurrenceId).mapWith(Boolean),
  createdAt: transactions.createdAt,
  category: { id: categories.id, name: categories.name, bucket: categories.bucket },
  recordedBy: {
    id: users.id,
    name: users.name,
    // Spending by a removed member stays in history, labelled "former member".
    isFormerMember: sql<boolean>`${householdMembers.id} is null`.mapWith(Boolean),
  },
};

// The recorder's ACTIVE membership; null means they've left the household.
const activeRecorder = and(
  eq(householdMembers.householdId, transactions.householdId),
  eq(householdMembers.userId, transactions.recordedBy),
  eq(householdMembers.status, 'ACTIVE'),
);

export function list(householdId: string, filters: TransactionFilters, page: number) {
  const { limit, offset } = pageToOffset(page);
  return db
    .select({
      ...entryColumns,
      attachmentCount: sql<number>`(select count(*) from ${attachments} where ${attachments.transactionId} = ${transactions.id})`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.recordedBy))
    .leftJoin(householdMembers, activeRecorder)
    .where(and(...conditions(householdId, filters)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Count and total of the filtered set, summed in SQL. */
export async function summarize(householdId: string, filters: TransactionFilters) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)::numeric(12,2)::text`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...conditions(householdId, filters)));
  return row ?? { count: 0, total: '0.00' };
}

export async function findById(householdId: string, id: string, client: DbClient = db) {
  const [row] = await client
    .select({
      ...entryColumns,
      recordedById: transactions.recordedBy,
      billOccurrenceId: transactions.billOccurrenceId,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.recordedBy))
    .leftJoin(householdMembers, activeRecorder)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)))
    .limit(1);
  if (!row) return undefined;

  const files = await attachmentsRepository.listByTransaction(householdId, id, client);
  return { ...row, attachments: files.map(({ storageKey: _key, ...file }) => file) };
}

export async function create(data: typeof transactions.$inferInsert, client: DbClient = db) {
  const [row] = await client.insert(transactions).values(data).returning({ id: transactions.id });
  return row!;
}

export async function update(
  householdId: string,
  id: string,
  data: Partial<Pick<typeof transactions.$inferInsert, 'amount' | 'date' | 'categoryId' | 'note'>>,
) {
  await db
    .update(transactions)
    .set(data)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)));
}

export async function remove(householdId: string, id: string, client: DbClient = db) {
  await client.delete(transactions).where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)));
}

/** The spending entry created by paying an occurrence (F6 undo). */
export async function findByOccurrence(householdId: string, occurrenceId: string, client: DbClient = db) {
  const [row] = await client
    .select({ id: transactions.id, date: transactions.date })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.billOccurrenceId, occurrenceId)))
    .limit(1);
  return row;
}

/** Latest entries for the dashboard (F8). */
export function listRecent(householdId: string, limit: number) {
  return db
    .select(entryColumns)
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.recordedBy))
    .leftJoin(householdMembers, activeRecorder)
    .where(eq(transactions.householdId, householdId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}
