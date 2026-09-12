import type { Client, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const clientRepository = {
  findMany(params: { skip: number; take: number }): Promise<Client[]> {
    return prisma.client.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { name: 'asc' },
    });
  },

  count(): Promise<number> {
    return prisma.client.count();
  },

  findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id } });
  },

  create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data });
  },

  update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return prisma.client.update({ where: { id }, data });
  },

  delete(id: string): Promise<Client> {
    return prisma.client.delete({ where: { id } });
  },

  countProjects(clientId: string): Promise<number> {
    return prisma.project.count({ where: { clientId } });
  },
};
