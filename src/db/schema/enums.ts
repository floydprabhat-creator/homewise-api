import { pgEnum } from 'drizzle-orm/pg-core';
import { BUCKETS, HOUSEHOLD_STATUSES, HOUSEHOLD_TYPES, MEMBER_STATUSES, ROLES } from '../../shared/constants.js';

export const memberRoleEnum = pgEnum('member_role', ROLES);
export const memberStatusEnum = pgEnum('member_status', MEMBER_STATUSES);
export const householdTypeEnum = pgEnum('household_type', HOUSEHOLD_TYPES);
export const householdStatusEnum = pgEnum('household_status', HOUSEHOLD_STATUSES);
export const bucketEnum = pgEnum('bucket', BUCKETS);
