import { pgEnum } from 'drizzle-orm/pg-core';
import {
  BILL_AMOUNT_TYPES,
  BILL_STATUSES,
  BUCKETS,
  EMAIL_STATUSES,
  FREQUENCIES,
  HOUSEHOLD_STATUSES,
  HOUSEHOLD_TYPES,
  INVITE_STATUSES,
  MEMBER_STATUSES,
  NOTIFICATION_TYPES,
  OCCURRENCE_STATUSES,
  ROLES,
} from '../../shared/constants.js';

export const memberRoleEnum = pgEnum('member_role', ROLES);
export const memberStatusEnum = pgEnum('member_status', MEMBER_STATUSES);
export const householdTypeEnum = pgEnum('household_type', HOUSEHOLD_TYPES);
export const householdStatusEnum = pgEnum('household_status', HOUSEHOLD_STATUSES);
export const bucketEnum = pgEnum('bucket', BUCKETS);
export const frequencyEnum = pgEnum('bill_frequency', FREQUENCIES);
export const billAmountTypeEnum = pgEnum('bill_amount_type', BILL_AMOUNT_TYPES);
export const billStatusEnum = pgEnum('bill_status', BILL_STATUSES);
export const occurrenceStatusEnum = pgEnum('occurrence_status', OCCURRENCE_STATUSES);
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES);
export const emailStatusEnum = pgEnum('email_status', EMAIL_STATUSES);
export const inviteStatusEnum = pgEnum('invite_status', INVITE_STATUSES);
