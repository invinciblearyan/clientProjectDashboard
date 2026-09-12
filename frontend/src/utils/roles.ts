import type { PublicUser, UserRole } from '../types/api';

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'PROJECT_MANAGER':
      return '/manager';
    case 'DEVELOPER':
      return '/developer';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'PROJECT_MANAGER':
      return 'Project Manager';
    case 'DEVELOPER':
      return 'Developer';
  }
}

export function userHasRole(user: PublicUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}
