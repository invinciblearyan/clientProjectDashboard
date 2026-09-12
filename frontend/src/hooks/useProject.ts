import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import { queryKeys } from '../api/queryKeys';

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ''),
    queryFn: () => projectsApi.getById(projectId!),
    enabled: Boolean(projectId),
  });
}
