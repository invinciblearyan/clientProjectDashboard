import { useQuery } from '@tanstack/react-query';
import { developersApi } from '../api/developers.api';
import { queryKeys } from '../api/queryKeys';

export function useDevelopers() {
  return useQuery({
    queryKey: queryKeys.developers.list({ limit: 100 }),
    queryFn: () => developersApi.list({ limit: 100 }),
  });
}
