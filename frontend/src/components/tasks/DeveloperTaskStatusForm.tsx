import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { queryKeys } from '../../api/queryKeys';
import type { TaskStatus } from '../../types/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Select } from '../common/Select';
import { getAuthErrorMessage } from '../../utils/errors';
import { TASK_STATUS_OPTIONS } from './TaskStatusBadge';
import './DeveloperTaskStatusForm.css';

interface DeveloperTaskStatusFormProps {
  taskId: string;
  currentStatus: TaskStatus;
}

export function DeveloperTaskStatusForm({ taskId, currentStatus }: DeveloperTaskStatusFormProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const updateMutation = useMutation({
    mutationFn: (nextStatus: TaskStatus) => tasksApi.update(taskId, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.developer });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      setFormError(null);
    },
    onError: (error) => {
      setFormError(getAuthErrorMessage(error));
    },
  });

  const hasChanges = status !== currentStatus;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!hasChanges || updateMutation.isPending) {
      return;
    }

    updateMutation.mutate(status);
  }

  return (
    <Card title="Update status" subtitle="Change the status of this assigned task">
      <form className="update-task-status-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="update-task-status-form__banner" role="alert">
            {formError}
          </div>
        ) : null}

        <Select
          name="status"
          label="Task status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          options={TASK_STATUS_OPTIONS}
          disabled={updateMutation.isPending}
        />

        <div className="update-task-status-form__actions">
          <Button
            type="submit"
            loading={updateMutation.isPending}
            disabled={!hasChanges || updateMutation.isPending}
          >
            Update status
          </Button>
        </div>
      </form>
    </Card>
  );
}
