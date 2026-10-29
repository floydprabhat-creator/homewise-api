import { z } from 'zod';
import { JOB_NAMES } from '../../jobs/registry.js';
import { dateSchema } from '../../shared/common.schemas.js';

export const jobNameSchema = z.object({ name: z.enum(JOB_NAMES) });

/** Outside production, `date` replays a day (e.g. the F9 worked example); production always uses today. */
export const runJobBodySchema = z.object({ date: dateSchema.optional() });
