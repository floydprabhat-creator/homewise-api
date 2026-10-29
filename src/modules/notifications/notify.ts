import { db } from '../../db/index.js';
import type { DbClient } from '../../db/types.js';
import type { NotificationType } from '../../shared/constants.js';
import * as notificationsRepository from './notifications.repository.js';

export type NotifyInput = {
  userId: string;
  householdId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  dedupeKey: string;
  /** Queue an email too (F9's sender job picks up PENDING rows). */
  email: boolean;
};

/** The single way to create a notification. Accepts a transaction client so it rolls back with the change. */
export async function notify({ email, ...input }: NotifyInput, client: DbClient = db) {
  await notificationsRepository.insertIgnoreDuplicate(
    { ...input, emailStatus: email ? 'PENDING' : 'NOT_REQUIRED' },
    client,
  );
}
