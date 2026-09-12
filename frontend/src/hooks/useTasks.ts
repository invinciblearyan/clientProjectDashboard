import { useQuery } from '@tanstack/react-query';
import { tasksApi, type ListTasksParams } from '../api/tasks.api';
import { queryKeys } from '../api/queryKeys';

export function useTasks(params?: ListTasksParams) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => tasksApi.list(params),
  });
}

export function useProjectTasks(projectId: string | undefined, params?: Omit<ListTasksParams, 'projectId'>) {
  return useQuery({
    queryKey: queryKeys.tasks.byProject(projectId ?? '', params),
    queryFn: () => tasksApi.list({ ...params, projectId: projectId! }),
    enabled: Boolean(projectId),
  });
}
