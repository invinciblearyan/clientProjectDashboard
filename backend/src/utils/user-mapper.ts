import type { User } from '@prisma/client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
