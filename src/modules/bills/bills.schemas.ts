import { z } from 'zod';
import { amountSchema, dateSchema, uuidSchema } from '../../shared/common.schemas.js';
import { BILL_AMOUNT_TYPES, FREQUENCIES, OCCURRENCE_STATUSES } from '../../shared/constants.js';

const remindDaysSchema = z.coerce.number().int().min(1, 'At least 1 day').max(7, 'At most 7 days');

// No defaults here: a partial update must not reset fields the client didn't send.
const billFields = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep the name under 80 characters'),
  categoryId: uuidSchema,
  amountType: z.enum(BILL_AMOUNT_TYPES),
  amount: amountSchema,
  frequency: z.enum(FREQUENCIES),
  firstDueDate: dateSchema,
  remindDaysBefore: remindDaysSchema,
  /** Null or omitted: the head pays. */
  defaultAssigneeId: uuidSchema.nullable().optional(),
});

export const createBillSchema = billFields.extend({ remindDaysBefore: remindDaysSchema.default(3) });

// Changing frequency or first due date isn't supported in v1: archive and recreate instead.
export const updateBillSchema = billFields
  .omit({ firstDueDate: true, frequency: true })
  .partial()
  .extend({ status: z.enum(['ACTIVE', 'PAUSED']).optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const listBillsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default(false),
});

export const updateOccurrenceSchema = z
  .object({
    amountDue: amountSchema.optional(),
    /** Null = back to the head. */
    assigneeId: uuidSchema.nullable().optional(),
  })
  .refine((v) => v.amountDue !== undefined || v.assigneeId !== undefined, 'Nothing to update');

export const payOccurrenceSchema = z.object({
  paidAmount: amountSchema,
  paidAt: dateSchema,
});

export const listOccurrencesQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.enum(OCCURRENCE_STATUSES).optional(),
  /** Also include unpaid occurrences due before `from`, so overdue bills are never hidden. */
  includeOverdue: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  billId: uuidSchema.optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;
export type UpdateOccurrenceInput = z.infer<typeof updateOccurrenceSchema>;
export type PayOccurrenceInput = z.infer<typeof payOccurrenceSchema>;
export type ListOccurrencesQuery = z.infer<typeof listOccurrencesQuerySchema>;
