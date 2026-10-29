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
