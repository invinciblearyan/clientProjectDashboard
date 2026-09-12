import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import { queryKeys } from '../api/queryKeys';

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? ''),
    queryFn: () => tasksApi.getById(taskId!),
    enabled: Boolean(taskId),
  });
}
