import { numeric, pgTable, primaryKey, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { categories } from './categories.js';
import { timestamps } from './columns.js';
import { bucketEnum } from './enums.js';
import { households } from './households.js';
import { users } from './users.js';

export const monthlyBudgets = pgTable(
  'monthly_budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    /** YYYY-MM, IST calendar month. */
    month: varchar('month', { length: 7 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    /** Null when created by the carry-over job. */
    updatedBy: uuid('updated_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('monthly_budgets_household_month_idx').on(t.householdId, t.month)],
);

export const budgetAllocations = pgTable(
  'budget_allocations',
  {
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => monthlyBudgets.id, { onDelete: 'cascade' }),
    bucket: bucketEnum('bucket').notNull(),
    percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.budgetId, t.bucket] })],
);

export const categoryTargets = pgTable(
  'category_targets',
  {
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => monthlyBudgets.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.budgetId, t.categoryId] })],
);

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
