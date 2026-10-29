import { z } from 'zod';
import { amountSchema, percentSchema, uuidSchema } from '../../domain/common.schemas.js';
import { HOUSEHOLD_TYPES } from '../../domain/constants.js';
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

export const updateHouseholdSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep the name under 80 characters').optional(),
    /** Only PERSONAL → FAMILY: a family can't go back to "Just me". */
    type: z.literal('FAMILY').optional(),
  })
  .refine((v) => v.name !== undefined || v.type !== undefined, 'Nothing to update');

export const memberParamSchema = z.object({ userId: uuidSchema });

export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
