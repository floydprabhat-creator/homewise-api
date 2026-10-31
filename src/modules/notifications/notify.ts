import { db } from '../../db/index.js';
import type { DbClient } from '../../db/types.js';
import type { NotificationType } from '../../domain/constants.js';
import * as notificationsRepository from './notifications.repository.js';

type NotifyInput = {
  userId: string;
  householdId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  dedupeKey: string;
  /** Queue an email too (sent by the send-emails job: after the daily job, or right away for budget alerts). */
  email: boolean;
};

/**
 * The single way to create a notification. Accepts a transaction client so it rolls back with the change.
 * Returns false when the dedupe key was already used, so nothing new was created.
 */
export async function notify({ email, ...input }: NotifyInput, client: DbClient = db) {
  return notificationsRepository.insertIgnoreDuplicate(
    { ...input, emailStatus: email ? 'PENDING' : 'NOT_REQUIRED' },
    client,
  );
}
