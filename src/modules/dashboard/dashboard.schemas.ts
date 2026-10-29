import { z } from 'zod';
import { monthSchema } from '../../domain/common.schemas.js';

/** Default: the current IST month. */
export const dashboardQuerySchema = z.object({ month: monthSchema.optional() });
