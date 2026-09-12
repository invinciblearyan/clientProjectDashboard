import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const listProjectsQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  clientId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createProjectBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: projectStatusSchema.optional(),
  clientId: z.string().cuid(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateProjectBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: projectStatusSchema.optional(),
  clientId: z.string().cuid().optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
