import type { UserRole } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { authService } from './auth.service';
import { authorizationService } from './authorization.service';
import { toPublicUser } from '../utils/user-mapper';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { conflict, notFound } from '../utils/api-error';
import type { AuthUser } from '../types/auth';

export const userService = {
  async listDevelopers(actor: AuthUser, page: number, limit: number) {
    authorizationService.assertAdminOrPm(actor);
    const pagination = getPagination({ page, limit });
    const [developers, total] = await Promise.all([
      userRepository.findManyDevelopers(pagination),
      userRepository.countDevelopers(),
    ]);

    return {
      data: developers,
      pagination: buildPaginationMeta({ page, limit }, total),
    };
  },

  async list(actor: AuthUser, page: number, limit: number) {
    authorizationService.assertAdmin(actor);
    const pagination = getPagination({ page, limit });
    const [users, total] = await Promise.all([
      userRepository.findMany(pagination),
      userRepository.count(),
    ]);

    return {
      data: users.map(toPublicUser),
      pagination: buildPaginationMeta({ page, limit }, total),
    };
  },

  async getById(actor: AuthUser, id: string) {
    authorizationService.assertAdmin(actor);
    const user = await userRepository.findById(id);

    if (!user) {
      throw notFound('User not found');
    }

    return toPublicUser(user);
  },

  async create(
    actor: AuthUser,
    input: { email: string; password: string; name: string; role: UserRole },
  ) {
    authorizationService.assertAdmin(actor);

    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw conflict('A user with this email already exists');
    }

    const passwordHash = await authService.hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });

    return toPublicUser(user);
  },

  async update(
    actor: AuthUser,
    id: string,
    input: { name?: string; role?: UserRole; isActive?: boolean },
  ) {
    authorizationService.assertAdmin(actor);

    const user = await userRepository.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const updated = await userRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (input.isActive === false) {
      await import('../repositories/refresh-token.repository').then((m) =>
        m.refreshTokenRepository.revokeAllForUser(id),
      );
    }

    return toPublicUser(updated);
  },

  async deactivate(actor: AuthUser, id: string) {
    return this.update(actor, id, { isActive: false });
  },
};
