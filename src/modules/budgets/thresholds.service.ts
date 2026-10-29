/**
 * F7 fills this in: compare usage before and after a change and notify the head when Essentials,
 * Lifestyle or the overall budget crosses 80% / 100%. Callers already invoke it after every
 * spending change and budget update, so F7 only needs to implement the body.
 */
export async function checkAfterChange(_householdId: string, _month: string): Promise<void> {}
