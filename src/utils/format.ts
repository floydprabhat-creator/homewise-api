const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const withPaise = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });

/** ₹2,315 or ₹1,250.50 (whole rupees drop the decimals), for notification and email text. */
export function formatINR(value: string | number) {
  const paise = Math.round(Number(value) * 100);
  return `₹${paise % 100 === 0 ? rupees.format(paise / 100) : withPaise.format(paise / 100)}`;
}

/** "October" for 2026-10. */
export function monthName(month: string) {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

/** "10 Nov" for 2026-11-10. */
export function formatDay(date: string) {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}
