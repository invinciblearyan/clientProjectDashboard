import { apiRequest } from './client';
import type {
  CreateProjectInput,
  ProjectListResponse,
  ProjectResponse,
} from '../types/api';

export type ListProjectsParams = {
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
};

function buildProjectsQuery(params: ListProjectsParams = {}): string {
  const search = new URLSearchParams();

  if (params.status) {
    search.set('status', params.status);
  }
  if (params.clientId) {
    search.set('clientId', params.clientId);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/projects?${query}` : '/api/projects';
}

export const projectsApi = {
  list(params?: ListProjectsParams): Promise<ProjectListResponse> {
    return apiRequest<ProjectListResponse>(buildProjectsQuery(params));
  },

  getById(id: string): Promise<ProjectResponse> {
    return apiRequest<ProjectResponse>(`/api/projects/${id}`);
  },

  create(input: CreateProjectInput): Promise<ProjectResponse> {
    return apiRequest<ProjectResponse>('/api/projects', {
      method: 'POST',
      body: input,
    });
  },
};
