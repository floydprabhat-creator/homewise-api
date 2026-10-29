import { z } from 'zod';

export const uuidSchema = z.uuid();
export const idParamSchema = z.object({ id: uuidSchema });

// Trim and lowercase before the format check, so "  Foo@Bar.com " is accepted as "foo@bar.com".
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Money travels as a string ("1250" or "1250.50") so it never passes through a float. */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount with up to 2 decimals')
      .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  );

/** A calendar date, YYYY-MM-DD. */
export const dateSchema = z.iso.date('Enter a valid date');

/** A calendar month, YYYY-MM. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Enter a month as YYYY-MM');
export const monthParamSchema = z.object({ month: monthSchema });

/** Percentages with up to 2 decimals, e.g. 33.33. */
export const percentSchema = z.coerce
  .number()
  .min(0)
  .max(100)
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'Use at most 2 decimals');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
