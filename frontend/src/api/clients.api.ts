import { apiRequest } from './client';
import type {
  ClientListResponse,
  ClientResponse,
  CreateClientInput,
  UpdateClientInput,
} from '../types/api';

export type ListClientsParams = {
  page?: number;
  limit?: number;
};

function buildClientsQuery(params: ListClientsParams = {}): string {
  const search = new URLSearchParams();

  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/clients?${query}` : '/api/clients';
}

export const clientsApi = {
  list(params?: ListClientsParams): Promise<ClientListResponse> {
    return apiRequest<ClientListResponse>(buildClientsQuery(params));
  },

  getById(id: string): Promise<ClientResponse> {
    return apiRequest<ClientResponse>(`/api/clients/${id}`);
  },

  create(input: CreateClientInput): Promise<ClientResponse> {
    return apiRequest<ClientResponse>('/api/clients', {
      method: 'POST',
      body: input,
    });
  },

  update(id: string, input: UpdateClientInput): Promise<ClientResponse> {
    return apiRequest<ClientResponse>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: input,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },
};
