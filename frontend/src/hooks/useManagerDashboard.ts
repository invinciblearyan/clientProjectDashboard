import type { ManagerDashboard } from '../types/api';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { queryKeys } from '../api/queryKeys';

export function useManagerDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.manager,
    queryFn: async () => {
      const response = await dashboardApi.getDashboard();
      return response.data as ManagerDashboard;
    },
  });
}
