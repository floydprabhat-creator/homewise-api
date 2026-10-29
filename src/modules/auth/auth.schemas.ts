import { z } from 'zod';
import { emailSchema } from '../../domain/common.schemas.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  inviteToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
