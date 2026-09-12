import { apiRequest } from './client';
import type { DashboardResponse } from '../types/api';

export const dashboardApi = {
  getDashboard(): Promise<DashboardResponse> {
    return apiRequest<DashboardResponse>('/api/dashboard');
  },
};
