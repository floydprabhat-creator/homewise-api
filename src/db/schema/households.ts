import { sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.js';
import { householdStatusEnum, householdTypeEnum, memberRoleEnum, memberStatusEnum } from './enums.js';
import { users } from './users.js';

export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  type: householdTypeEnum('type').notNull(),
  status: householdStatusEnum('status').notNull().default('ACTIVE'),
  ...timestamps,
});

export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: memberRoleEnum('role').notNull(),
    status: memberStatusEnum('status').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // A user has at most one ACTIVE membership at a time.
    uniqueIndex('household_members_active_user_idx')
      .on(t.userId)
      .where(sql`${t.status} = 'ACTIVE'`),
    index('household_members_household_idx').on(t.householdId),
  ],
);

export type Household = typeof households.$inferSelect;
