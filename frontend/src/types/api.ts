export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: ApiErrorDetail[];
  };
}

export interface AuthSessionResponse {
  data: {
    accessToken: string;
    user: PublicUser;
  };
}

export interface MeResponse {
  data: PublicUser;
}

export interface LogoutResponse {
  message: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatusCounts = {
  TODO: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
};

export type TaskPriorityCounts = {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
};

export type AdminDashboard = {
  totalProjects: number;
  tasksByStatus: TaskStatusCounts;
  overdueTaskCount: number;
  activeUsersOnline: number;
};

export interface AdminDashboardResponse {
  data: AdminDashboard;
}

export type ManagerDashboardUpcomingTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  project: {
    id: string;
    name: string;
  };
};

export type ManagerDashboard = {
  projectCount: number;
  tasksByPriority: TaskPriorityCounts;
  upcomingDueThisWeek: ManagerDashboardUpcomingTask[];
};

export interface ManagerDashboardResponse {
  data: ManagerDashboard;
}

export type DeveloperAssignedTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isOverdue: boolean;
  project: {
    id: string;
    name: string;
  };
};

export type DeveloperDashboard = {
  assignedTasks: DeveloperAssignedTask[];
};

export interface DeveloperDashboardResponse {
  data: DeveloperDashboard;
}

export type DashboardResponse =
  | AdminDashboardResponse
  | ManagerDashboardResponse
  | DeveloperDashboardResponse;

export type ProjectStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type Client = {
  id: string;
  name: string;
  company: string | null;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  clientId: string;
  createdById: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ProjectResponse {
  data: Project;
}

export type ProjectListResponse = PaginatedResponse<Project>;

export interface ClientListResponse extends PaginatedResponse<Client> {}

export interface ClientResponse {
  data: Client;
}

export type CreateClientInput = {
  name: string;
  company?: string;
  contactEmail?: string;
};

export type UpdateClientInput = {
  name?: string;
  company?: string | null;
  contactEmail?: string | null;
};

export type UserListResponse = PaginatedResponse<PublicUser>;

export interface UserResponse {
  data: PublicUser;
}

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

export type UpdateUserInput = {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  clientId: string;
  startDate?: string;
  dueDate?: string;
};

export type TaskAssignee = {
  id: string;
  name: string;
  email: string;
};

export type TaskProjectRef = {
  id: string;
  name: string;
  createdById: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  overdueAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  project: TaskProjectRef;
  assignee: TaskAssignee | null;
};

export interface TaskResponse {
  data: Task;
}

export type TaskListResponse = PaginatedResponse<Task>;

export type CreateTaskInput = {
  title: string;
  projectId: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
};

export type UpdateTaskStatusInput = {
  status: TaskStatus;
};

export type DeveloperTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isOverdue: boolean;
  overdueAt: string | null;
  assigneeId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
};

export interface DeveloperTaskResponse {
  data: DeveloperTask;
}

export type TaskDetail = Task | DeveloperTask;

export interface TaskDetailResponse {
  data: TaskDetail;
}

export type DeveloperOption = {
  id: string;
  name: string;
  email: string;
};

export type DeveloperListResponse = PaginatedResponse<DeveloperOption>;

export type ActivityType =
  | 'TASK_STATUS_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED';

export type ActivityEvent = {
  id: string;
  type: ActivityType | string;
  summary: string;
  source: string;
  actorId: string | null;
  actor: { id: string; name: string } | null;
  projectId: string | null;
  taskId: string | null;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  createdAt: string;
  project: { id: string; name: string; createdById: string } | null;
  task: { id: string; title: string; assigneeId: string | null } | null;
};

export type ActivityListResponse = PaginatedResponse<ActivityEvent>;

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_OVERDUE'
  | 'PROJECT_UPDATED';

export type Notification = {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  projectId: string | null;
  taskId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  data: Notification[];
};

export type UnreadCountResponse = {
  data: { unreadCount: number };
};

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: ApiErrorDetail[];

  constructor(statusCode: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.code = body.code;
    this.requestId = body.requestId;
    this.details = body.details;
  }
}
