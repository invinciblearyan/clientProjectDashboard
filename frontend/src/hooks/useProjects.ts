import { useQuery } from '@tanstack/react-query';
import { projectsApi, type ListProjectsParams } from '../api/projects.api';
import { queryKeys } from '../api/queryKeys';

export function useProjects(params?: ListProjectsParams) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectsApi.list(params),
  });
}
