import type { Prisma, Project, ProjectStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface ProjectListFilters {
  status?: ProjectStatus;
  clientId?: string;
  createdById?: string;
  skip: number;
  take: number;
}

export const projectRepository = {
  findMany(filters: ProjectListFilters): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.createdById ? { createdById: filters.createdById } : {}),
      },
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    });
  },

  count(filters: Omit<ProjectListFilters, 'skip' | 'take'>): Promise<number> {
    return prisma.project.count({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.createdById ? { createdById: filters.createdById } : {}),
      },
    });
  },

  findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
      include: { client: true },
    });
  },

  findByIdForPm(id: string, createdById: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, createdById },
      include: { client: true },
    });
  },

  create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return prisma.project.create({
      data,
      include: { client: true },
    });
  },

  update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
      include: { client: true },
    });
  },

  delete(id: string): Promise<Project> {
    return prisma.project.delete({ where: { id } });
  },
};
