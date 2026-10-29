import { z } from 'zod';
import { uuidSchema } from '../../domain/common.schemas.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep the name under 80 characters'),
});

/** Prove it's you with the current password or an emailed code, not both. */
export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    currentPassword: z.string().min(1, 'Enter your current password').optional(),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code')
      .optional(),
  })
  .refine((v) => (v.currentPassword === undefined) !== (v.code === undefined), {
    message: 'Give either your current password or the emailed code',
    path: ['currentPassword'],
  });

export const userParamSchema = z.object({ id: uuidSchema });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
