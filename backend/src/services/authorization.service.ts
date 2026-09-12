import type { UserRole } from '@prisma/client';
import type { AuthUser } from '../types/auth';
import { forbidden, notFound } from '../utils/api-error';

export const authorizationService = {
  assertRoles(user: AuthUser, ...roles: UserRole[]): void {
    if (!roles.includes(user.role)) {
      throw forbidden('You do not have permission to perform this action');
    }
  },

  assertAdmin(user: AuthUser): void {
    this.assertRoles(user, 'ADMIN');
  },

  assertAdminOrPm(user: AuthUser): void {
    this.assertRoles(user, 'ADMIN', 'PROJECT_MANAGER');
  },

  assertAdminOrPmOrDeveloper(user: AuthUser): void {
    this.assertRoles(user, 'ADMIN', 'PROJECT_MANAGER', 'DEVELOPER');
  },

  assertProjectAccess(user: AuthUser, createdById: string): void {
    if (user.role === 'ADMIN') {
      return;
    }

    if (user.role === 'PROJECT_MANAGER' && createdById === user.id) {
      return;
    }

    throw notFound('Project not found');
  },

  assertDeveloperTaskAccess(user: AuthUser, assigneeId: string | null): void {
    if (user.role !== 'DEVELOPER') {
      return;
    }

    if (assigneeId !== user.id) {
      throw notFound('Task not found');
    }
  },

  denyDeveloperFromProjects(user: AuthUser): void {
    if (user.role === 'DEVELOPER') {
      throw forbidden('You do not have permission to perform this action');
    }
  },
};
