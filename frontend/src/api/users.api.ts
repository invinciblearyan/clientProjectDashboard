import { apiRequest } from './client';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListResponse,
  UserResponse,
} from '../types/api';

export type ListUsersParams = {
  page?: number;
  limit?: number;
};

function buildUsersQuery(params: ListUsersParams = {}): string {
  const search = new URLSearchParams();

  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/users?${query}` : '/api/users';
}

export const usersApi = {
  list(params?: ListUsersParams): Promise<UserListResponse> {
    return apiRequest<UserListResponse>(buildUsersQuery(params));
  },

  getById(id: string): Promise<UserResponse> {
    return apiRequest<UserResponse>(`/api/users/${id}`);
  },

  create(input: CreateUserInput): Promise<UserResponse> {
    return apiRequest<UserResponse>('/api/users', {
      method: 'POST',
      body: input,
    });
  },

  update(id: string, input: UpdateUserInput): Promise<UserResponse> {
    return apiRequest<UserResponse>(`/api/users/${id}`, {
      method: 'PATCH',
      body: input,
    });
  },

  deactivate(id: string): Promise<UserResponse> {
    return apiRequest<UserResponse>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },
};
