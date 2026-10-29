import { relations } from 'drizzle-orm';
import { billOccurrences, bills } from './bills.js';
import { budgetAllocations, categoryTargets, monthlyBudgets } from './budgets.js';
import { categories } from './categories.js';
import { householdMembers, households } from './households.js';
import { attachments, transactions } from './transactions.js';
import { users } from './users.js';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(householdMembers),
}));

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  categories: many(categories),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, { fields: [householdMembers.householdId], references: [households.id] }),
  user: one(users, { fields: [householdMembers.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  household: one(households, { fields: [categories.householdId], references: [households.id] }),
}));

export const monthlyBudgetsRelations = relations(monthlyBudgets, ({ many }) => ({
  allocations: many(budgetAllocations),
  targets: many(categoryTargets),
}));

export const budgetAllocationsRelations = relations(budgetAllocations, ({ one }) => ({
  budget: one(monthlyBudgets, { fields: [budgetAllocations.budgetId], references: [monthlyBudgets.id] }),
}));

export const categoryTargetsRelations = relations(categoryTargets, ({ one }) => ({
  budget: one(monthlyBudgets, { fields: [categoryTargets.budgetId], references: [monthlyBudgets.id] }),
  category: one(categories, { fields: [categoryTargets.categoryId], references: [categories.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  recorder: one(users, { fields: [transactions.recordedBy], references: [users.id] }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, { fields: [attachments.transactionId], references: [transactions.id] }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  category: one(categories, { fields: [bills.categoryId], references: [categories.id] }),
  occurrences: many(billOccurrences),
}));

export const billOccurrencesRelations = relations(billOccurrences, ({ one }) => ({
  bill: one(bills, { fields: [billOccurrences.billId], references: [bills.id] }),
}));
