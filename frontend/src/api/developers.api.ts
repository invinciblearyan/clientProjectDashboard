import { apiRequest } from './client';
import type { DeveloperListResponse } from '../types/api';

export type ListDevelopersParams = {
  page?: number;
  limit?: number;
};

function buildDevelopersQuery(params: ListDevelopersParams = {}): string {
  const search = new URLSearchParams();

  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/users/developers?${query}` : '/api/users/developers';
}

export const developersApi = {
  list(params?: ListDevelopersParams): Promise<DeveloperListResponse> {
    return apiRequest<DeveloperListResponse>(buildDevelopersQuery(params));
  },
};
