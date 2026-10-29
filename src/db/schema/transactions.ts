import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { billOccurrences } from './bills.js';
import { categories } from './categories.js';
import { timestamps } from './columns.js';
import { households } from './households.js';
import { users } from './users.js';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    note: varchar('note', { length: 200 }),
    /** Set when the entry was created by paying a bill; at most one entry per occurrence. */
    billOccurrenceId: uuid('bill_occurrence_id').references(() => billOccurrences.id),
    ...timestamps,
  },
  (t) => [
    index('transactions_household_date_idx').on(t.householdId, t.date),
    index('transactions_category_idx').on(t.categoryId),
    uniqueIndex('transactions_bill_occurrence_idx').on(t.billOccurrenceId),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    contentType: varchar('content_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('attachments_transaction_idx').on(t.transactionId)],
);

export type Attachment = typeof attachments.$inferSelect;
