import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityListParams } from '../api/activity.api';
import { queryKeys } from '../api/queryKeys';

export function useActivity(params: ActivityListParams = {}) {
  return useQuery({
    queryKey: queryKeys.activity.list(params),
    queryFn: () => activityApi.list(params),
  });
}
