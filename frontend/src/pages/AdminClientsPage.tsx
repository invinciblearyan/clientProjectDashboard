import { useState } from 'react';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { Button } from '../components/common/Button';
import { ClientFormPanel, type ClientFormValues } from '../components/clients/ClientFormPanel';
import { ClientTable } from '../components/clients/ClientTable';
import {
  useAdminClients,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from '../hooks/useAdminClients';
import { ApiRequestError, type Client } from '../types/api';
import { getAuthErrorMessage } from '../utils/errors';
import './admin-management.css';

type PanelMode = 'none' | 'create' | 'edit';

type ClientFieldErrors = {
  name?: string;
  company?: string;
  contactEmail?: string;
};

function mapClientApiFieldErrors(
  details: Array<{ field: string; message: string }> | undefined,
): ClientFieldErrors {
  const nextFieldErrors: ClientFieldErrors = {};

  if (!details?.length) {
    return nextFieldErrors;
  }

  for (const detail of details) {
    if (detail.field === 'name' || detail.field === 'company' || detail.field === 'contactEmail') {
      nextFieldErrors[detail.field] = detail.message;
    }
  }

  return nextFieldErrors;
}

export function AdminClientsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [panelMode, setPanelMode] = useState<PanelMode>('none');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  function resetPanel() {
    setPanelMode('none');
    setEditingClient(null);
    setFormError(null);
    setFieldErrors({});
  }

  function openCreatePanel() {
    setSuccessMessage(null);
    setActionError(null);
    setFormError(null);
    setFieldErrors({});
    setEditingClient(null);
    setPanelMode('create');
  }

  function openEditPanel(client: Client) {
    setSuccessMessage(null);
    setActionError(null);
    setFormError(null);
    setFieldErrors({});
    setEditingClient(client);
    setPanelMode('edit');
  }

  function buildClientPayload(values: ClientFormValues) {
    return {
      name: values.name,
      ...(values.company ? { company: values.company } : {}),
      ...(values.contactEmail ? { contactEmail: values.contactEmail } : {}),
    };
  }

  function handleCreateSubmit(values: ClientFormValues) {
    if (!values.name.trim()) {
      setFormError('Client name is required.');
      return;
    }

    setFormError(null);
    setFieldErrors({});

    createClient.mutate(buildClientPayload(values), {
      onSuccess: () => {
        resetPanel();
        setSuccessMessage('Client created successfully.');
      },
      onError: (mutationError) => {
        if (mutationError instanceof ApiRequestError) {
          setFieldErrors(mapClientApiFieldErrors(mutationError.details));
        }
        setFormError(getAuthErrorMessage(mutationError));
      },
    });
  }

  function handleEditSubmit(values: ClientFormValues) {
    if (!editingClient) {
      return;
    }

    if (!values.name.trim()) {
      setFormError('Client name is required.');
      return;
    }

    setFormError(null);
    setFieldErrors({});

    updateClient.mutate(
      {
        id: editingClient.id,
        input: {
          name: values.name,
          company: values.company.trim() ? values.company.trim() : null,
          contactEmail: values.contactEmail.trim() ? values.contactEmail.trim() : null,
        },
      },
      {
        onSuccess: () => {
          resetPanel();
          setSuccessMessage('Client updated successfully.');
        },
        onError: (mutationError) => {
          if (mutationError instanceof ApiRequestError) {
            setFieldErrors(mapClientApiFieldErrors(mutationError.details));
          }
          setFormError(getAuthErrorMessage(mutationError));
        },
      },
    );
  }

  function handleDelete(client: Client) {
    setSuccessMessage(null);
    setActionError(null);
    setDeletingClientId(client.id);

    deleteClient.mutate(client.id, {
      onSuccess: () => {
        setSuccessMessage(`${client.name} was deleted.`);
      },
      onError: (mutationError) => {
        setActionError(getAuthErrorMessage(mutationError));
      },
      onSettled: () => {
        setDeletingClientId(null);
      },
    });
  }

  return (
    <div className="admin-management">
      <header className="admin-management__header">
        <div>
          <h1 className="admin-management__title">Clients</h1>
          <p className="admin-management__subtitle">
            Manage client records used when creating projects. Deletion is blocked when projects exist.
          </p>
        </div>
        {panelMode === 'none' ? (
          <Button type="button" variant="secondary" size="sm" onClick={openCreatePanel}>
            Add client
          </Button>
        ) : null}
      </header>

      {successMessage ? (
        <div className="admin-management__banner admin-management__banner--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="admin-management__banner" role="alert">
          {actionError}
        </div>
      ) : null}

      {panelMode === 'create' ? (
        <div className="admin-management__panel">
          <Card title="Create client" subtitle="Clients can be assigned to new projects">
            <ClientFormPanel
              mode="create"
              loading={createClient.isPending}
              formError={formError}
              fieldErrors={fieldErrors}
              onSubmit={handleCreateSubmit}
              onCancel={resetPanel}
            />
          </Card>
        </div>
      ) : null}

      {panelMode === 'edit' && editingClient ? (
        <div className="admin-management__panel">
          <Card title="Edit client" subtitle={`Updating ${editingClient.name}`}>
            <ClientFormPanel
              key={editingClient.id}
              mode="edit"
              initialClient={editingClient}
              loading={updateClient.isPending}
              formError={formError}
              fieldErrors={fieldErrors}
              onSubmit={handleEditSubmit}
              onCancel={resetPanel}
            />
          </Card>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading clients…" />
      ) : isError ? (
        <ErrorState
          title="Unable to load clients"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Create a client before assigning projects."
          />
        </Card>
      ) : (
        <Card title="Client list" subtitle={`${data.pagination.total} client(s)`}>
          <ClientTable
            clients={data.data}
            onEdit={openEditPanel}
            onDelete={handleDelete}
            deletingClientId={deletingClientId}
          />
        </Card>
      )}
    </div>
  );
}
