import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi, type ListClientsParams } from '../api/clients.api';
import { queryKeys } from '../api/queryKeys';
import type { CreateClientInput, UpdateClientInput } from '../types/api';

export function useAdminClients(params?: ListClientsParams) {
  return useQuery({
    queryKey: queryKeys.clients.list(params ?? { limit: 100 }),
    queryFn: () => clientsApi.list({ limit: 100, ...params }),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) => clientsApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) =>
      clientsApi.update(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
