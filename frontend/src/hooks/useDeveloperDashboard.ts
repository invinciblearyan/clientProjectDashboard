import type { DeveloperDashboard } from '../types/api';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { queryKeys } from '../api/queryKeys';

export function useDeveloperDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.developer,
    queryFn: async () => {
      const response = await dashboardApi.getDashboard();
      return response.data as DeveloperDashboard;
    },
  });
}
