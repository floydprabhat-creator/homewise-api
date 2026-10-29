import { z } from 'zod';
import {
  amountSchema,
  dateSchema,
  monthSchema,
  paginationSchema,
  uuidSchema,
} from '../../domain/common.schemas.js';
import { BUCKETS } from '../../domain/constants.js';

// Multipart forms send an empty string for a blank note; store that as no note.
const noteSchema = z
  .string()
  .trim()
  .max(200, 'Keep the note under 200 characters')
  .transform((v) => (v === '' ? null : v));

export const createTransactionSchema = z.object({
  amount: amountSchema,
  date: dateSchema,
  categoryId: uuidSchema,
  note: noteSchema.optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const listTransactionsQuerySchema = paginationSchema.extend({
  month: monthSchema.optional(),
  bucket: z.enum(BUCKETS).optional(),
  categoryId: uuidSchema.optional(),
  recordedBy: uuidSchema.optional(),
  hasAttachment: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().max(100).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionFilters = Omit<ListTransactionsQuery, 'page' | 'month'> & { month: string };
