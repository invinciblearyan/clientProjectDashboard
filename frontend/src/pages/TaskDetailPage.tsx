import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DeveloperTaskStatusForm } from '../components/tasks/DeveloperTaskStatusForm';
import { PriorityBadge } from '../components/tasks/PriorityBadge';
import { TaskStatusBadge } from '../components/tasks/TaskStatusBadge';
import { useProjectRealtime } from '../hooks/useProjectRealtime';
import { useTask } from '../hooks/useTask';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import { formatDisplayDate } from '../utils/format-dates';
import { getTaskBackPath } from '../utils/project-paths';
import type { Task } from '../types/api';
import './projects.css';

function isAdminOrPmTask(task: unknown): task is Task {
  return typeof task === 'object' && task !== null && 'assignee' in task;
}

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId?: string; taskId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useTask(taskId);

  const isDeveloper = user?.role === 'DEVELOPER';
  const resolvedProjectId = projectId ?? data?.data.projectId;
  const canUseProjectRealtime =
    !isDeveloper && Boolean(resolvedProjectId) && (user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER');

  useProjectRealtime(resolvedProjectId, canUseProjectRealtime);

  if (!user || !taskId) {
    return null;
  }

  if (!isDeveloper && !projectId) {
    return null;
  }

  const backPath = getTaskBackPath(user.role, resolvedProjectId ?? projectId ?? '');

  if (isLoading) {
    return (
      <div className="projects-page">
        <LoadingState label="Loading task…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="projects-page">
        <header className="projects-page__header">
          <h1 className="projects-page__title">Task details</h1>
        </header>
        <ErrorState
          title="Unable to load task"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  const task = data.data;

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">{task.title}</h1>
          <p className="projects-page__subtitle">
            {task.project.name}
            {task.isOverdue ? ' · Overdue' : ''}
          </p>
        </div>
        <Link to={backPath} className="btn btn--ghost btn--sm">
          {isDeveloper ? 'Back to my tasks' : 'Back to project'}
        </Link>
      </header>

      <Card title="Task information">
        <dl className="project-detail">
          <div className="project-detail__row">
            <dt>Status</dt>
            <dd>
              <TaskStatusBadge status={task.status} />
            </dd>
          </div>
          <div className="project-detail__row">
            <dt>Priority</dt>
            <dd>
              <PriorityBadge priority={task.priority} />
            </dd>
          </div>
          <div className="project-detail__row">
            <dt>Project</dt>
            <dd>{task.project.name}</dd>
          </div>
          {!isDeveloper && isAdminOrPmTask(task) ? (
            <div className="project-detail__row">
              <dt>Assigned developer</dt>
              <dd>{task.assignee ? `${task.assignee.name} (${task.assignee.email})` : 'Unassigned'}</dd>
            </div>
          ) : null}
          <div className="project-detail__row">
            <dt>Due date</dt>
            <dd>{formatDisplayDate(task.dueDate)}</dd>
          </div>
          <div className="project-detail__row">
            <dt>Overdue</dt>
            <dd>
              {task.isOverdue ? <Badge variant="danger">Overdue</Badge> : 'No'}
            </dd>
          </div>
          <div className="project-detail__row">
            <dt>Created</dt>
            <dd>{formatDisplayDate(task.createdAt)}</dd>
          </div>
          <div className="project-detail__row">
            <dt>Last updated</dt>
            <dd>{formatDisplayDate(task.updatedAt)}</dd>
          </div>
          {task.description ? (
            <div className="project-detail__row project-detail__row--full">
              <dt>Description</dt>
              <dd>{task.description}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {isDeveloper ? (
        <DeveloperTaskStatusForm taskId={task.id} currentStatus={task.status} />
      ) : null}
    </div>
  );
}
