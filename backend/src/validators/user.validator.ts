import { z } from 'zod';

export const createUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']),
});

export const updateUserBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).optional(),
  isActive: z.boolean().optional(),
});
