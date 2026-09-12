import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../api/projects.api';
import { queryKeys } from '../../api/queryKeys';
import type { ProjectStatus } from '../../types/api';
import { ApiRequestError } from '../../types/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Input } from '../common/Input';
import { LoadingState } from '../common/LoadingState';
import { Select } from '../common/Select';
import { useClients } from '../../hooks/useClients';
import { getAuthErrorMessage } from '../../utils/errors';
import { dateInputToIsoDateTime } from '../../utils/format-dates';
import { getProjectDetailPath } from '../../utils/project-paths';
import { useAuth } from '../../hooks/useAuth';
import { PROJECT_STATUS_OPTIONS } from './ProjectStatusBadge';
import './CreateProjectForm.css';

type FieldErrors = {
  name?: string;
  clientId?: string;
  description?: string;
};

export function CreateProjectForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clientsResponse, isLoading: clientsLoading, isError: clientsError, error: clientsLoadError, refetch: refetchClients } = useClients();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      if (user) {
        navigate(getProjectDetailPath(user.role, response.data.id));
      }
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && error.details?.length) {
        const nextFieldErrors: FieldErrors = {};
        for (const detail of error.details) {
          if (detail.field === 'name' || detail.field === 'clientId' || detail.field === 'description') {
            nextFieldErrors[detail.field] = detail.message;
          }
        }
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
        }
      }
      setFormError(getAuthErrorMessage(error));
    },
  });

  function validateForm(): boolean {
    const nextErrors: FieldErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'Project name is required';
    }

    if (!clientId) {
      nextErrors.clientId = 'Client is required';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      clientId,
      ...(description.trim() ? { description: description.trim() } : {}),
      status,
      ...(startDate ? { startDate: dateInputToIsoDateTime(startDate) } : {}),
      ...(dueDate ? { dueDate: dateInputToIsoDateTime(dueDate) } : {}),
    });
  }

  if (clientsLoading) {
    return <LoadingState label="Loading clients…" />;
  }

  if (clientsError) {
    return (
      <ErrorState
        title="Unable to load clients"
        message={getAuthErrorMessage(clientsLoadError)}
        actionLabel="Try again"
        onAction={() => void refetchClients()}
      />
    );
  }

  const clients = clientsResponse?.data ?? [];

  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients available"
        description="A client must exist before you can create a project. Contact an administrator if clients need to be added."
      />
    );
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.company ? `${client.name} (${client.company})` : client.name,
  }));

  return (
    <Card title="Create project" subtitle="Assign the project to an existing client">
      <form className="create-project-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="create-project-form__banner" role="alert">
            {formError}
          </div>
        ) : null}

        <Input
          name="name"
          label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
          maxLength={200}
          required
        />

        <div className={`field ${fieldErrors.description ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="field__textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            rows={4}
          />
          {fieldErrors.description ? (
            <p className="field__error">{fieldErrors.description}</p>
          ) : (
            <p className="field__hint">Optional project summary (max 2000 characters)</p>
          )}
        </div>

        <Select
          name="clientId"
          label="Client"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          error={fieldErrors.clientId}
          placeholder="Select a client"
          options={clientOptions}
          required
        />

        <Select
          name="status"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ProjectStatus)}
          options={PROJECT_STATUS_OPTIONS}
        />

        <div className="create-project-form__dates">
          <Input
            name="startDate"
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            name="dueDate"
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <div className="create-project-form__actions">
          <Button type="submit" loading={createMutation.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Card>
  );
}
