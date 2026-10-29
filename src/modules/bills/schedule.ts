import type { Frequency, OccurrenceStatus } from '../../shared/constants.js';
import { addDays, addMonths, daysInMonth } from '../../utils/dates.js';

const STEP_MONTHS: Record<Exclude<Frequency, 'ONE_TIME'>, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

type DisplayStatus = 'PAID' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';

/**
 * The due date after `current`, or null for a one-time bill. Keeps the bill's anchor day and clamps
 * to the month's last day when it doesn't exist: 31 Jan → 28 Feb → 31 Mar (not 28 Mar).
 */
export function nextDueDate(current: string, frequency: Frequency, anchorDay: number): string | null {
  if (frequency === 'ONE_TIME') return null;
  const month = addMonths(current.slice(0, 7), STEP_MONTHS[frequency]);
  const day = Math.min(anchorDay, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** Calculated from IST today, never stored. */
export function getOccurrenceStatus(
  occ: { status: OccurrenceStatus; dueDate: string },
  remindDaysBefore: number,
  today: string,
): DisplayStatus {
  if (occ.status === 'PAID') return 'PAID';
  if (occ.dueDate < today) return 'OVERDUE';
  if (addDays(occ.dueDate, -remindDaysBefore) <= today) return 'DUE_SOON';
  return 'UPCOMING';
}
