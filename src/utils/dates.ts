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

/** Shift a YYYY-MM-DD date by n days. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Number of days in a YYYY-MM month. */
export function daysInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

/** Days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
