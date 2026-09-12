import { z } from 'zod';

export const createClientBodySchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
});

export const updateClientBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
});
