import { TIMEZONE } from '../config/constants.js';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in IST as YYYY-MM-DD. All business dates use IST. */
export function todayIST(now = new Date()): string {
  return dateFormatter.format(now);
}

/** The current IST month as YYYY-MM. */
export function currentMonthIST(now = new Date()): string {
  return todayIST(now).slice(0, 7);
}

/** Shift a YYYY-MM month by n months. */
export function addMonths(month: string, n: number): string {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const index = year * 12 + (mon - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** First day of the month and first day of the next month, for `date >= start AND date < end`. */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}
