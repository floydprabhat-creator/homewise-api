/** Percent values carry 2 decimals; compare them as integer hundredths to avoid float drift. */
export function toHundredths(value: number | string): number {
  return Math.round(Number(value) * 100);
}
