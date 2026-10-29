import { z } from 'zod';
import { paginationSchema } from '../../domain/common.schemas.js';

export const listNotificationsQuerySchema = paginationSchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default(false),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
