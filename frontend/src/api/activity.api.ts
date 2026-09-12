import { apiRequest } from './client';
import type { ActivityListResponse } from '../types/api';

export type ActivityListParams = {
  projectId?: string;
  page?: number;
  limit?: number;
};

export const activityApi = {
  list(params: ActivityListParams = {}): Promise<ActivityListResponse> {
    const searchParams = new URLSearchParams();

    if (params.projectId) {
      searchParams.set('projectId', params.projectId);
    }
    if (params.page !== undefined) {
      searchParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return apiRequest<ActivityListResponse>(`/api/activity${query ? `?${query}` : ''}`);
  },
};
