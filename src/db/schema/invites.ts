import { sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.js';
import { inviteStatusEnum } from './enums.js';
import { households } from './households.js';
import { users } from './users.js';

export const invites = pgTable(
  'invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    /** Lowercased. Accepting requires the logged-in email to match. */
    email: varchar('email', { length: 254 }).notNull(),
    /** Optional, given by the head: greets the invitee and prefills their sign-up. */
    name: varchar('name', { length: 80 }),
    /** SHA-256 of the token; the plain token only exists in the email link. */
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    status: inviteStatusEnum('status').notNull().default('PENDING'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    acceptedBy: uuid('accepted_by').references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // One pending invite per email per household.
    uniqueIndex('invites_household_email_pending_idx')
      .on(t.householdId, t.email)
      .where(sql`${t.status} = 'PENDING'`),
    index('invites_household_idx').on(t.householdId),
  ],
);

export type Invite = typeof invites.$inferSelect;
