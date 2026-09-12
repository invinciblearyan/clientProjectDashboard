import type { AdminDashboard } from '../types/api';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { queryKeys } from '../api/queryKeys';

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.admin,
    queryFn: async () => {
      const response = await dashboardApi.getDashboard();
      return response.data as AdminDashboard;
    },
  });
}
