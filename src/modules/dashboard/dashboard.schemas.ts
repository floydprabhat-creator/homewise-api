import { z } from 'zod';
import { monthSchema } from '../../shared/common.schemas.js';

/** Default: the current IST month. */
export const dashboardQuerySchema = z.object({ month: monthSchema.optional() });
