import { apiRequest } from './client';
import type {
  CreateTaskInput,
  DeveloperTaskResponse,
  TaskDetailResponse,
  TaskListResponse,
  TaskResponse,
  UpdateTaskStatusInput,
} from '../types/api';

export type ListTasksParams = {
  status?: string;
  priority?: string;
  projectId?: string;
  assigneeId?: string;
  isOverdue?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
};

function buildTasksQuery(params: ListTasksParams = {}): string {
  const search = new URLSearchParams();

  if (params.status) {
    search.set('status', params.status);
  }
  if (params.priority) {
    search.set('priority', params.priority);
  }
  if (params.projectId) {
    search.set('projectId', params.projectId);
  }
  if (params.assigneeId) {
    search.set('assigneeId', params.assigneeId);
  }
  if (params.isOverdue !== undefined) {
    search.set('isOverdue', params.isOverdue ? 'true' : 'false');
  }
  if (params.dueDateFrom) {
    search.set('dueDateFrom', params.dueDateFrom);
  }
  if (params.dueDateTo) {
    search.set('dueDateTo', params.dueDateTo);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/tasks?${query}` : '/api/tasks';
}

export const tasksApi = {
  list(params?: ListTasksParams): Promise<TaskListResponse> {
    return apiRequest<TaskListResponse>(buildTasksQuery(params));
  },

  getById(id: string): Promise<TaskDetailResponse> {
    return apiRequest<TaskDetailResponse>(`/api/tasks/${id}`);
  },

  create(input: CreateTaskInput): Promise<TaskResponse> {
    return apiRequest<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: input,
    });
  },

  update(id: string, input: UpdateTaskStatusInput): Promise<DeveloperTaskResponse> {
    return apiRequest<DeveloperTaskResponse>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: input,
    });
  },
};
