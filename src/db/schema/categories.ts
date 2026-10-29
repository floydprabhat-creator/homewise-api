import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.js';
import { bucketEnum } from './enums.js';
import { households } from './households.js';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: varchar('name', { length: 40 }).notNull(),
    bucket: bucketEnum('bucket').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('categories_household_name_idx').on(t.householdId, sql`lower(${t.name})`),
    index('categories_household_idx').on(t.householdId),
  ],
);

export type Category = typeof categories.$inferSelect;
