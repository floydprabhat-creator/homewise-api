import { z } from 'zod';
import { amountSchema, percentSchema, uuidSchema } from '../../domain/common.schemas.js';
import { toHundredths } from '../../utils/money.js';

export const allocationsSchema = z.object({
  ESSENTIALS: percentSchema,
  LIFESTYLE: percentSchema,
  SAVINGS: percentSchema,
});

type Allocations = z.infer<typeof allocationsSchema>;

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

/** Rupees with up to 2 decimals; 0 allowed ("no rent"). */
const rupeesOrZeroSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).replace(/,/g, '').trim())
  .pipe(z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount with up to 2 decimals'));

export const HOUSEHOLD_SIZES = ['1', '2', '3-4', '5+'] as const;
export const EMERGENCY_SAVINGS = ['NONE', 'UNDER_3_MONTHS', '3_TO_6_MONTHS', 'OVER_6_MONTHS'] as const;
export const SAVING_GOALS = ['EMERGENCY_FUND', 'HOME', 'RETIREMENT', 'CHILD_EDUCATION', 'TRAVEL', 'DEBT_FREE'] as const;
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;

/** The budget assistant's questions, plus any change requests typed after the first suggestion. */
export const budgetAdviceSchema = z.object({
  answers: z.object({
    monthlyIncome: amountSchema,
    householdSize: z.enum(HOUSEHOLD_SIZES),
    housingCost: rupeesOrZeroSchema,
    otherEmis: rupeesOrZeroSchema,
    emergencySavings: z.enum(EMERGENCY_SAVINGS),
    goal: z.enum(SAVING_GOALS),
    risk: z.enum(RISK_LEVELS),
  }),
  requests: z.array(z.string().trim().min(1).max(300, 'Keep it under 300 characters')).max(5).default([]),
  /** The suggestion the requests are about, so a change request adjusts it instead of starting over. */
  current: z
    .object({
      allocations: allocationsSchema,
      targets: z.array(z.object({ categoryId: uuidSchema, percent: percentSchema })).max(20),
    })
    .optional(),
});

export type BudgetAdviceInput = z.infer<typeof budgetAdviceSchema>;
