import type {
  ActivityEvent,
  AdminDashboard,
  AuthSessionResponse,
  Client,
  DeveloperAssignedTask,
  DeveloperDashboard,
  DeveloperOption,
  DeveloperTask,
  ManagerDashboard,
  ManagerDashboardUpcomingTask,
  Project,
  PublicUser,
  Task,
  UserRole,
} from '../types/api';

export function createUser(role: UserRole, overrides: Partial<PublicUser> = {}): PublicUser {
  const roleLabel = role.toLowerCase().replace('_', '-');

  return {
    id: `${roleLabel}-id`,
    email: `${roleLabel}@example.com`,
    name: `${role} User`,
    role,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createSession(role: UserRole): AuthSessionResponse {
  const user = createUser(role);

  return {
    data: {
      accessToken: `access-token-${role}`,
      user,
    },
  };
}

export function createAdminDashboard(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    totalProjects: 12,
    tasksByStatus: {
      TODO: 4,
      IN_PROGRESS: 6,
      IN_REVIEW: 2,
      DONE: 18,
    },
    overdueTaskCount: 3,
    activeUsersOnline: 5,
    ...overrides,
  };
}

export function createManagerUpcomingTask(
  overrides: Partial<ManagerDashboardUpcomingTask> = {},
): ManagerDashboardUpcomingTask {
  return {
    id: 'task-upcoming-1',
    title: 'Implement login flow',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: '2026-09-15T00:00:00.000Z',
    project: {
      id: 'project-1',
      name: 'Client Portal Redesign',
    },
    ...overrides,
  };
}

export function createManagerDashboard(overrides: Partial<ManagerDashboard> = {}): ManagerDashboard {
  return {
    projectCount: 4,
    tasksByPriority: {
      CRITICAL: 2,
      HIGH: 5,
      MEDIUM: 8,
      LOW: 3,
    },
    upcomingDueThisWeek: [
      createManagerUpcomingTask(),
      createManagerUpcomingTask({
        id: 'task-upcoming-2',
        title: 'Security review checklist',
        priority: 'CRITICAL',
        status: 'TODO',
        dueDate: '2026-09-12T00:00:00.000Z',
        project: { id: 'project-2', name: 'Mobile App MVP' },
      }),
    ],
    ...overrides,
  };
}

export function createDeveloperAssignedTask(
  overrides: Partial<DeveloperAssignedTask> = {},
): DeveloperAssignedTask {
  return {
    id: 'task-assigned-1',
    title: 'Implement login flow',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-09-15T00:00:00.000Z',
    isOverdue: false,
    project: {
      id: 'project-1',
      name: 'Client Portal Redesign',
    },
    ...overrides,
  };
}

export function createDeveloperDashboard(
  overrides: Partial<DeveloperDashboard> = {},
): DeveloperDashboard {
  return {
    assignedTasks: [
      createDeveloperAssignedTask(),
      createDeveloperAssignedTask({
        id: 'task-assigned-2',
        title: 'Security patch deployment',
        status: 'TODO',
        priority: 'CRITICAL',
        dueDate: '2026-09-10T00:00:00.000Z',
        isOverdue: true,
        project: { id: 'project-2', name: 'Mobile App MVP' },
      }),
      createDeveloperAssignedTask({
        id: 'task-assigned-3',
        title: 'Write unit tests',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        dueDate: '2026-09-20T00:00:00.000Z',
        project: { id: 'project-1', name: 'Client Portal Redesign' },
      }),
      createDeveloperAssignedTask({
        id: 'task-assigned-4',
        title: 'Update documentation',
        status: 'DONE',
        priority: 'LOW',
        dueDate: '2026-09-05T00:00:00.000Z',
        project: { id: 'project-3', name: 'Internal Analytics Dashboard' },
      }),
    ],
    ...overrides,
  };
}

export function createClient(overrides: Partial<Client> = {}) {
  return {
    id: 'client-1',
    name: 'Acme Corporation',
    company: 'Acme Corp',
    contactEmail: 'contact@acme.example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createProject(overrides: Partial<Project> = {}) {
  const client = createClient(overrides.client ?? {});
  return {
    id: 'project-1',
    name: 'Client Portal Redesign',
    description: 'Modernize the client-facing portal.',
    status: 'IN_PROGRESS' as const,
    clientId: client.id,
    createdById: 'project-manager-id',
    startDate: '2026-09-01T00:00:00.000Z',
    dueDate: '2026-12-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    client,
    ...overrides,
  };
}

export function createProjectListResponse(
  projects = [createProject()],
  pagination = { page: 1, limit: 100, total: projects.length, totalPages: 1 },
) {
  return { data: projects, pagination };
}

export function createUserListResponse(
  users = [createUser('ADMIN'), createUser('PROJECT_MANAGER'), createUser('DEVELOPER')],
  pagination = { page: 1, limit: 100, total: users.length, totalPages: 1 },
) {
  return { data: users, pagination };
}

export function createClientListResponse(
  clients = [createClient()],
  pagination = { page: 1, limit: 100, total: clients.length, totalPages: 1 },
) {
  return { data: clients, pagination };
}

export function createDeveloperOption(overrides: Partial<DeveloperOption> = {}): DeveloperOption {
  return {
    id: 'developer-1',
    name: 'Dev One',
    email: 'dev1@example.com',
    ...overrides,
  };
}

export function createDeveloperListResponse(
  developers = [createDeveloperOption()],
  pagination = { page: 1, limit: 100, total: developers.length, totalPages: 1 },
) {
  return { data: developers, pagination };
}

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Implement login flow',
    description: 'Build the authentication screens.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    projectId: 'project-1',
    assigneeId: 'developer-1',
    dueDate: '2026-09-15T00:00:00.000Z',
    isOverdue: false,
    overdueAt: null,
    createdById: 'project-manager-id',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    project: {
      id: 'project-1',
      name: 'Client Portal Redesign',
      createdById: 'project-manager-id',
    },
    assignee: createDeveloperOption(),
    ...overrides,
  };
}

export function createTaskListResponse(
  tasks = [createTask()],
  pagination = { page: 1, limit: 100, total: tasks.length, totalPages: 1 },
) {
  return { data: tasks, pagination };
}

export function createDeveloperTask(overrides: Partial<DeveloperTask> = {}): DeveloperTask {
  return {
    id: 'task-assigned-1',
    title: 'Implement login flow',
    description: 'Build the authentication screens.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-09-15T00:00:00.000Z',
    isOverdue: false,
    overdueAt: null,
    assigneeId: 'developer-id',
    projectId: 'project-1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    project: {
      id: 'project-1',
      name: 'Client Portal Redesign',
    },
    ...overrides,
  };
}

export function createActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'activity-1',
    type: 'TASK_STATUS_CHANGED',
    summary: 'Task "Design homepage" status changed from IN_PROGRESS to IN_REVIEW',
    source: 'USER',
    actorId: 'developer-id',
    actor: { id: 'developer-id', name: 'Ravi' },
    projectId: 'project-1',
    taskId: 'task-1',
    previousStatus: 'IN_PROGRESS',
    newStatus: 'IN_REVIEW',
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    project: {
      id: 'project-1',
      name: 'Client Portal Redesign',
      createdById: 'project-manager-id',
    },
    task: {
      id: 'task-1',
      title: 'Design homepage',
      assigneeId: 'developer-id',
    },
    ...overrides,
  };
}

export function createActivityListResponse(
  events = [createActivityEvent()],
  pagination = { page: 1, limit: 20, total: events.length, totalPages: 1 },
) {
  return { data: events, pagination };
}
