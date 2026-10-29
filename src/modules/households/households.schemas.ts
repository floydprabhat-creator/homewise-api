import { z } from 'zod';
import { amountSchema, percentSchema } from '../../shared/common.schemas.js';
import { HOUSEHOLD_TYPES } from '../../shared/constants.js';
import { allocationsSchema, allocationsTotal100, allocationsTotalIssue } from '../budgets/budgets.schemas.js';

/**
 * Mode + family name + the first budget, saved in one request. Savings targets are given by name
 * because the categories don't exist until the household is created.
 */
export const onboardingSchema = z
  .object({
    mode: z.enum(HOUSEHOLD_TYPES),
    familyName: z.string().trim().max(80).optional(),
    totalAmount: amountSchema,
    allocations: allocationsSchema,
    targets: z
      .object({ investments: percentSchema, emergencyFund: percentSchema })
      .default({ investments: 0, emergencyFund: 0 }),
  })
  .refine((v) => allocationsTotal100(v.allocations), allocationsTotalIssue)
  .refine((v) => v.mode !== 'FAMILY' || Boolean(v.familyName), {
    message: 'Enter a family name',
    path: ['familyName'],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
