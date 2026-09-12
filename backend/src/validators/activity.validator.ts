import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const listActivityQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().cuid().optional(),
});
