import { index, pgTable, smallint, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { emailStatusEnum, notificationTypeEnum } from './enums.js';
import { households } from './households.js';
import { users } from './users.js';

/** In-app notifications, and the email outbox for those that also send email (sent by the send-emails job). */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    body: text('body').notNull(),
    /** In-app path to open, e.g. /bills or /budget. */
    link: varchar('link', { length: 300 }),
    /** Each event is announced once: a second insert with the same key is ignored. */
    dedupeKey: varchar('dedupe_key', { length: 200 }).notNull().unique(),
    readAt: timestamp('read_at', { withTimezone: true }),
    emailStatus: emailStatusEnum('email_status').notNull().default('NOT_REQUIRED'),
    emailAttempts: smallint('email_attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.createdAt)],
);

export type Notification = typeof notifications.$inferSelect;
