import { PAGE_SIZE } from '../../config/constants.js';
import { AppError } from '../../utils/app-error.js';
import * as notificationsRepository from './notifications.repository.js';
import type { ListNotificationsQuery } from './notifications.schemas.js';

export async function list(userId: string, query: ListNotificationsQuery) {
  const [items, unreadCount] = await Promise.all([
    notificationsRepository.listForUser(userId, query),
    notificationsRepository.countUnread(userId),
  ]);
  return { items, unreadCount, page: query.page, pageSize: PAGE_SIZE };
}

export async function markRead(userId: string, id: string) {
  if (!(await notificationsRepository.markRead(userId, id))) throw AppError.notFound('Notification not found');
}

export function markAllRead(userId: string) {
  return notificationsRepository.markAllRead(userId);
}
