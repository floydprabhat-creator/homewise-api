import { z } from 'zod';
import { amountSchema, percentSchema, uuidSchema } from '../../shared/common.schemas.js';
import { toHundredths } from '../../utils/money.js';

export const allocationsSchema = z.object({
  ESSENTIALS: percentSchema,
  LIFESTYLE: percentSchema,
  SAVINGS: percentSchema,
});

export type Allocations = z.infer<typeof allocationsSchema>;

export const allocationsTotal100 = (a: Allocations) =>
  toHundredths(a.ESSENTIALS) + toHundredths(a.LIFESTYLE) + toHundredths(a.SAVINGS) === 10000;

export const allocationsTotalIssue = { message: 'Bucket percentages must total 100%', path: ['allocations'] };

export const upsertBudgetSchema = z
  .object({
    totalAmount: amountSchema,
    allocations: allocationsSchema,
    targets: z.array(z.object({ categoryId: uuidSchema, percent: percentSchema })).default([]),
  })
  .refine((v) => allocationsTotal100(v.allocations), allocationsTotalIssue);

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
