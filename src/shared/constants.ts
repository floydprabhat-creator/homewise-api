export const ROLES = ['HEAD', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = ['ACTIVE', 'REMOVED'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const HOUSEHOLD_TYPES = ['PERSONAL', 'FAMILY'] as const;
export type HouseholdType = (typeof HOUSEHOLD_TYPES)[number];

export const HOUSEHOLD_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type HouseholdStatus = (typeof HOUSEHOLD_STATUSES)[number];

export const BUCKETS = ['ESSENTIALS', 'LIFESTYLE', 'SAVINGS'] as const;
export type Bucket = (typeof BUCKETS)[number];

export const FREQUENCIES = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const BILL_AMOUNT_TYPES = ['FIXED', 'VARIABLE'] as const;
export type BillAmountType = (typeof BILL_AMOUNT_TYPES)[number];

export const BILL_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const OCCURRENCE_STATUSES = ['UNPAID', 'PAID'] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];
