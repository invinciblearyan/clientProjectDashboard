export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    admin: ['dashboard', 'admin'] as const,
    manager: ['dashboard', 'manager'] as const,
    developer: ['dashboard', 'developer'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (params?: Record<string, unknown>) => ['projects', 'list', params ?? {}] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (params?: Record<string, unknown>) => ['clients', 'list', params ?? {}] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params?: Record<string, unknown>) => ['users', 'list', params ?? {}] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: Record<string, unknown>) => ['tasks', 'list', params ?? {}] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    byProject: (projectId: string, params?: Record<string, unknown>) =>
      ['tasks', 'byProject', projectId, params ?? {}] as const,
  },
  developers: {
    all: ['developers'] as const,
    list: (params?: Record<string, unknown>) => ['developers', 'list', params ?? {}] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (params?: Record<string, unknown>) => ['activity', 'list', params ?? {}] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: ['notifications', 'list'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
} as const;
