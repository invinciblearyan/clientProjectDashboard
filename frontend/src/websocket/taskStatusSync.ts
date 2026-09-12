import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { TaskStatusChangedPayload } from './socketEvents';

export function invalidateTaskStatusQueries(
  queryClient: QueryClient,
  payload: Pick<TaskStatusChangedPayload, 'taskId' | 'projectId'>,
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(payload.taskId) });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.tasks.byProject(payload.projectId),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.developer });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.manager });
}
