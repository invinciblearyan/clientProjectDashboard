import type { UserRole } from '../types/api';

export const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'DEVELOPER', label: 'Developer' },
];

export function formatUserRole(role: UserRole): string {
  return USER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
