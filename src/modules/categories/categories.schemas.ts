import { z } from 'zod';
import { BUCKETS } from '../../domain/constants.js';

const nameSchema = z.string().trim().min(1, 'Name is required').max(40, 'Name is too long');

export const listCategoriesQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default(false),
});

export const createCategorySchema = z.object({
  name: nameSchema,
  bucket: z.enum(BUCKETS),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    bucket: z.enum(BUCKETS).optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
