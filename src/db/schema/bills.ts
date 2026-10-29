import { date, index, numeric, pgTable, smallint, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { categories } from './categories.js';
import { timestamps } from './columns.js';
import { billAmountTypeEnum, billStatusEnum, frequencyEnum, occurrenceStatusEnum } from './enums.js';
import { households } from './households.js';
import { users } from './users.js';

/** The template: one row per recurring (or one-time) bill. */
export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    name: varchar('name', { length: 80 }).notNull(),
    amountType: billAmountTypeEnum('amount_type').notNull(),
    /** Fixed amount, or the estimate for a variable bill. Copied to each new occurrence. */
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    frequency: frequencyEnum('frequency').notNull(),
    firstDueDate: date('first_due_date', { mode: 'string' }).notNull(),
    /** Day of month of firstDueDate, so 31 Jan → 28 Feb → 31 Mar instead of drifting to the 28th. */
    anchorDay: smallint('anchor_day').notNull(),
    remindDaysBefore: smallint('remind_days_before').notNull().default(3),
    /** Null means the head pays. */
    defaultAssigneeId: uuid('default_assignee_id').references(() => users.id),
    status: billStatusEnum('status').notNull().default('ACTIVE'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [index('bills_household_idx').on(t.householdId)],
);

/** One period of a bill: its own due date, amount, responsible member and paid state. */
export const billOccurrences = pgTable(
  'bill_occurrences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    billId: uuid('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull(),
    /** Null means the head is responsible. */
    assigneeId: uuid('assignee_id').references(() => users.id),
    status: occurrenceStatusEnum('status').notNull().default('UNPAID'),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }),
    paidAt: date('paid_at', { mode: 'string' }),
    paidBy: uuid('paid_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('bill_occurrences_bill_due_idx').on(t.billId, t.dueDate),
    index('bill_occurrences_household_due_idx').on(t.householdId, t.dueDate),
  ],
);

export type Bill = typeof bills.$inferSelect;
