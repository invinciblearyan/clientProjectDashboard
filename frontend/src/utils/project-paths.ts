import type { UserRole } from '../types/api';

export function getProjectsBasePath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/projects';
    case 'PROJECT_MANAGER':
      return '/manager/projects';
    case 'DEVELOPER':
      return '/developer';
  }
}

export function getProjectDetailPath(role: UserRole, projectId: string): string {
  return `${getProjectsBasePath(role)}/${projectId}`;
}

export function getCreateProjectPath(role: UserRole): string {
  return `${getProjectsBasePath(role)}/new`;
}

export function getCreateTaskPath(role: UserRole, projectId: string): string {
  return `${getProjectDetailPath(role, projectId)}/tasks/new`;
}

export function getTaskDetailPath(role: UserRole, projectId: string, taskId: string): string {
  return `${getProjectDetailPath(role, projectId)}/tasks/${taskId}`;
}

export function getDeveloperHomePath(): string {
  return '/developer';
}

export function getDeveloperTaskDetailPath(taskId: string): string {
  return `${getDeveloperHomePath()}/tasks/${taskId}`;
}

export function getTaskBackPath(role: UserRole, projectId: string): string {
  if (role === 'DEVELOPER') {
    return getDeveloperHomePath();
  }

  return getProjectDetailPath(role, projectId);
}
