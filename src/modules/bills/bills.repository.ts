import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { billOccurrences, bills, categories, households, users } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

export async function create(data: typeof bills.$inferInsert, client: DbClient = db) {
  const [row] = await client.insert(bills).values(data).returning();
  return row!;
}

export async function findById(householdId: string, id: string, client: DbClient = db) {
  const [row] = await client
    .select()
    .from(bills)
    .where(and(eq(bills.householdId, householdId), eq(bills.id, id)))
    .limit(1);
  return row;
}

// The earliest unpaid occurrence of each bill, for "next due" on the Manage bills tab.
const nextUnpaid = (column: typeof billOccurrences.dueDate | typeof billOccurrences.amountDue) =>
  sql<string | null>`(select ${column} from ${billOccurrences} where ${billOccurrences.billId} = ${bills.id} and ${billOccurrences.status} = 'UNPAID' order by ${billOccurrences.dueDate} limit 1)`;

/** Bill templates with their category, default payer and next unpaid occurrence. */
export function list(householdId: string, { includeArchived }: { includeArchived: boolean }) {
  return db
    .select({
      id: bills.id,
      name: bills.name,
      amountType: bills.amountType,
      amount: bills.amount,
      frequency: bills.frequency,
      firstDueDate: bills.firstDueDate,
      remindDaysBefore: bills.remindDaysBefore,
      status: bills.status,
      category: { id: categories.id, name: categories.name, bucket: categories.bucket },
      defaultAssigneeId: bills.defaultAssigneeId,
      defaultAssigneeName: users.name,
      nextDueDate: nextUnpaid(billOccurrences.dueDate),
      nextAmountDue: nextUnpaid(billOccurrences.amountDue),
    })
    .from(bills)
    .innerJoin(categories, eq(categories.id, bills.categoryId))
    .leftJoin(users, eq(users.id, bills.defaultAssigneeId))
    .where(and(eq(bills.householdId, householdId), includeArchived ? undefined : ne(bills.status, 'ARCHIVED')))
    .orderBy(
      sql`array_position(array['ACTIVE','PAUSED','ARCHIVED']::bill_status[], ${bills.status})`,
      asc(bills.name),
    );
}

export async function update(
  householdId: string,
  id: string,
  data: Partial<
    Pick<
      typeof bills.$inferInsert,
      'name' | 'categoryId' | 'amountType' | 'amount' | 'remindDaysBefore' | 'defaultAssigneeId' | 'status'
    >
  >,
) {
  const [row] = await db
    .update(bills)
    .set(data)
    .where(and(eq(bills.householdId, householdId), eq(bills.id, id)))
    .returning();
  return row;
}

/** Hard delete; occurrences cascade. Only for bills without paid occurrences. */
export async function remove(householdId: string, id: string) {
  await db.delete(bills).where(and(eq(bills.householdId, householdId), eq(bills.id, id)));
}

export async function archive(householdId: string, id: string, client: DbClient = db) {
  await client
    .update(bills)
    .set({ status: 'ARCHIVED' })
    .where(and(eq(bills.householdId, householdId), eq(bills.id, id)));
}

/** Active recurring bills in active households, for the occurrence job (all households). */
export function listActiveRecurring() {
  return db
    .select({
      id: bills.id,
      householdId: bills.householdId,
      amount: bills.amount,
      frequency: bills.frequency,
      anchorDay: bills.anchorDay,
      defaultAssigneeId: bills.defaultAssigneeId,
    })
    .from(bills)
    .innerJoin(households, eq(households.id, bills.householdId))
    .where(and(eq(bills.status, 'ACTIVE'), ne(bills.frequency, 'ONE_TIME'), eq(households.status, 'ACTIVE')));
}

/** Member removal (F2): their bills fall back to the head. */
export async function clearDefaultAssigneeForUser(householdId: string, userId: string, client: DbClient = db) {
  await client
    .update(bills)
    .set({ defaultAssigneeId: null })
    .where(and(eq(bills.householdId, householdId), eq(bills.defaultAssigneeId, userId)));
}
