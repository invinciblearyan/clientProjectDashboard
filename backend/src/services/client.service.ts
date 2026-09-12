import { clientRepository } from '../repositories/client.repository';
import { authorizationService } from './authorization.service';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { conflict, notFound } from '../utils/api-error';
import type { AuthUser } from '../types/auth';

export const clientService = {
  async list(actor: AuthUser, page: number, limit: number) {
    authorizationService.assertRoles(actor, 'ADMIN', 'PROJECT_MANAGER');
    const pagination = getPagination({ page, limit });
    const [clients, total] = await Promise.all([
      clientRepository.findMany(pagination),
      clientRepository.count(),
    ]);

    return {
      data: clients,
      pagination: buildPaginationMeta({ page, limit }, total),
    };
  },

  async getById(actor: AuthUser, id: string) {
    authorizationService.assertRoles(actor, 'ADMIN', 'PROJECT_MANAGER');
    const client = await clientRepository.findById(id);

    if (!client) {
      throw notFound('Client not found');
    }

    return client;
  },

  async create(
    actor: AuthUser,
    input: { name: string; company?: string; contactEmail?: string },
  ) {
    authorizationService.assertAdmin(actor);
    return clientRepository.create(input);
  },

  async update(
    actor: AuthUser,
    id: string,
    input: { name?: string; company?: string | null; contactEmail?: string | null },
  ) {
    authorizationService.assertAdmin(actor);

    const client = await clientRepository.findById(id);
    if (!client) {
      throw notFound('Client not found');
    }

    return clientRepository.update(id, input);
  },

  async delete(actor: AuthUser, id: string) {
    authorizationService.assertAdmin(actor);

    const client = await clientRepository.findById(id);
    if (!client) {
      throw notFound('Client not found');
    }

    const projectCount = await clientRepository.countProjects(id);
    if (projectCount > 0) {
      throw conflict('Cannot delete a client with linked projects');
    }

    return clientRepository.delete(id);
  },
};
