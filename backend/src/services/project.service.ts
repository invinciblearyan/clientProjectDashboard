import type { ProjectStatus } from '@prisma/client';
import { clientRepository } from '../repositories/client.repository';
import { projectRepository } from '../repositories/project.repository';
import { authorizationService } from './authorization.service';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { notFound } from '../utils/api-error';
import type { AuthUser } from '../types/auth';

export const projectService = {
  async list(
    actor: AuthUser,
    filters: { status?: ProjectStatus; clientId?: string; page: number; limit: number },
  ) {
    authorizationService.assertAdminOrPm(actor);
    authorizationService.denyDeveloperFromProjects(actor);

    const pagination = getPagination(filters);
    const listFilters = {
      status: filters.status,
      clientId: filters.clientId,
      createdById: actor.role === 'PROJECT_MANAGER' ? actor.id : undefined,
      skip: pagination.skip,
      take: pagination.take,
    };

    const [projects, total] = await Promise.all([
      projectRepository.findMany(listFilters),
      projectRepository.count({
        status: filters.status,
        clientId: filters.clientId,
        createdById: actor.role === 'PROJECT_MANAGER' ? actor.id : undefined,
      }),
    ]);

    return {
      data: projects,
      pagination: buildPaginationMeta(filters, total),
    };
  },

  async getById(actor: AuthUser, id: string) {
    authorizationService.assertAdminOrPm(actor);
    authorizationService.denyDeveloperFromProjects(actor);

    const project =
      actor.role === 'ADMIN'
        ? await projectRepository.findById(id)
        : await projectRepository.findByIdForPm(id, actor.id);

    if (!project) {
      throw notFound('Project not found');
    }

    return project;
  },

  async create(
    actor: AuthUser,
    input: {
      name: string;
      description?: string;
      status?: ProjectStatus;
      clientId: string;
      startDate?: Date;
      dueDate?: Date;
    },
  ) {
    authorizationService.assertAdminOrPm(actor);
    authorizationService.denyDeveloperFromProjects(actor);

    const client = await clientRepository.findById(input.clientId);
    if (!client) {
      throw notFound('Client not found');
    }

    const createdById = actor.role === 'ADMIN' ? actor.id : actor.id;

    return projectRepository.create({
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      dueDate: input.dueDate,
      client: { connect: { id: input.clientId } },
      createdBy: { connect: { id: createdById } },
    });
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      name?: string;
      description?: string | null;
      status?: ProjectStatus;
      clientId?: string;
      startDate?: Date | null;
      dueDate?: Date | null;
    },
  ) {
    authorizationService.assertAdminOrPm(actor);
    authorizationService.denyDeveloperFromProjects(actor);

    const project =
      actor.role === 'ADMIN'
        ? await projectRepository.findById(id)
        : await projectRepository.findByIdForPm(id, actor.id);

    if (!project) {
      throw notFound('Project not found');
    }

    if (input.clientId) {
      const client = await clientRepository.findById(input.clientId);
      if (!client) {
        throw notFound('Client not found');
      }
    }

    return projectRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.clientId ? { client: { connect: { id: input.clientId } } } : {}),
    });
  },

  async delete(actor: AuthUser, id: string) {
    authorizationService.assertAdminOrPm(actor);
    authorizationService.denyDeveloperFromProjects(actor);

    const project =
      actor.role === 'ADMIN'
        ? await projectRepository.findById(id)
        : await projectRepository.findByIdForPm(id, actor.id);

    if (!project) {
      throw notFound('Project not found');
    }

    return projectRepository.delete(id);
  },
};
