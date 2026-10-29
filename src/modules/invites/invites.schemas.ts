import { z } from 'zod';
import { emailSchema } from '../../domain/common.schemas.js';

export const createInviteSchema = z.object({ email: emailSchema });

// base64url of 32 bytes is 43 characters; anything else can't be a token.
export const tokenParamSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid invite link') });

export const acceptInviteSchema = z.object({
  /** Required when the caller heads a personal household, which is archived on joining. */
  confirmArchivePersonal: z.boolean().optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
