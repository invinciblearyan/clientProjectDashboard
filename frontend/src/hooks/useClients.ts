import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../api/clients.api';
import { queryKeys } from '../api/queryKeys';

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.list({ limit: 100 }),
    queryFn: () => clientsApi.list({ limit: 100 }),
  });
}
