/** Percent values carry 2 decimals; compare them as integer hundredths to avoid float drift. */
export function toHundredths(value: number | string): number {
  return Math.round(Number(value) * 100);
}

/** Money as integer paise, so sums and differences never pick up float error. */
export function toPaise(value: string | number): number {
  return Math.round(Number(value) * 100);
}

/** Integer paise back to the API's money string, e.g. 123450 → "1234.50". */
export function fromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** `part` as a percentage of `whole`, rounded to one decimal; null when `whole` is 0. */
export function percentOf(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}
