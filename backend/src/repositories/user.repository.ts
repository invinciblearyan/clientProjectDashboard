import type { Prisma, User, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findMany(params: { skip: number; take: number }): Promise<User[]> {
    return prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  },

  count(): Promise<number> {
    return prisma.user.count();
  },

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  findDeveloperById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, role: 'DEVELOPER', isActive: true },
    });
  },

  findManyDevelopers(params: { skip: number; take: number }): Promise<Array<Pick<User, 'id' | 'name' | 'email'>>> {
    return prisma.user.findMany({
      where: { role: 'DEVELOPER', isActive: true },
      skip: params.skip,
      take: params.take,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
  },

  countDevelopers(): Promise<number> {
    return prisma.user.count({ where: { role: 'DEVELOPER', isActive: true } });
  },

  findActiveAdmins(): Promise<Array<Pick<User, 'id'>>> {
    return prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
  },
};
