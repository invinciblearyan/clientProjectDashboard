import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks.api';
import { queryKeys } from '../../api/queryKeys';
import type { TaskPriority, TaskStatus } from '../../types/api';
import { ApiRequestError } from '../../types/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Input } from '../common/Input';
import { LoadingState } from '../common/LoadingState';
import { Select } from '../common/Select';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../utils/errors';
import { dateInputToIsoDateTime } from '../../utils/format-dates';
import { getTaskDetailPath } from '../../utils/project-paths';
import { TASK_PRIORITY_OPTIONS } from './PriorityBadge';
import { TASK_STATUS_OPTIONS } from './TaskStatusBadge';
import './CreateTaskForm.css';

type FieldErrors = {
  title?: string;
  assigneeId?: string;
  description?: string;
};

interface CreateTaskFormProps {
  projectId: string;
}

export function CreateTaskForm({ projectId }: CreateTaskFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    data: developersResponse,
    isLoading: developersLoading,
    isError: developersError,
    error: developersLoadError,
    refetch: refetchDevelopers,
  } = useDevelopers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (user) {
        navigate(getTaskDetailPath(user.role, projectId, response.data.id));
      }
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && error.details?.length) {
        const nextFieldErrors: FieldErrors = {};
        for (const detail of error.details) {
          if (detail.field === 'title' || detail.field === 'assigneeId' || detail.field === 'description') {
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

    if (!title.trim()) {
      nextErrors.title = 'Task title is required';
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
      title: title.trim(),
      projectId,
      ...(description.trim() ? { description: description.trim() } : {}),
      status,
      priority,
      ...(assigneeId ? { assigneeId } : {}),
      ...(dueDate ? { dueDate: dateInputToIsoDateTime(dueDate) } : {}),
    });
  }

  if (developersLoading) {
    return <LoadingState label="Loading developers…" />;
  }

  if (developersError) {
    return (
      <ErrorState
        title="Unable to load developers"
        message={getAuthErrorMessage(developersLoadError)}
        actionLabel="Try again"
        onAction={() => void refetchDevelopers()}
      />
    );
  }

  const developers = developersResponse?.data ?? [];

  if (developers.length === 0) {
    return (
      <EmptyState
        title="No developers available"
        description="An active developer account is required before you can assign tasks. Contact an administrator if developers need to be added."
      />
    );
  }

  const developerOptions = developers.map((developer) => ({
    value: developer.id,
    label: `${developer.name} (${developer.email})`,
  }));

  return (
    <Card title="Create task" subtitle="Add a task to this project">
      <form className="create-task-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="create-task-form__banner" role="alert">
            {formError}
          </div>
        ) : null}

        <Input
          name="title"
          label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={fieldErrors.title}
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
            <p className="field__hint">Optional task details (max 2000 characters)</p>
          )}
        </div>

        <Select
          name="assigneeId"
          label="Assigned developer"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          error={fieldErrors.assigneeId}
          placeholder="Select a developer (optional)"
          options={developerOptions}
        />

        <Select
          name="status"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          options={TASK_STATUS_OPTIONS}
        />

        <Select
          name="priority"
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
          options={TASK_PRIORITY_OPTIONS}
        />

        <Input
          name="dueDate"
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />

        <div className="create-task-form__actions">
          <Button type="submit" loading={createMutation.isPending}>
            Create task
          </Button>
        </div>
      </form>
    </Card>
  );
}
