import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { TaskFiltersBar } from './TaskFiltersBar';
import { TaskList } from './TaskList';
import { TaskListSkeleton } from './TaskListSkeleton';
import { useProjectTasks } from '../../hooks/useTasks';
import { getAuthErrorMessage } from '../../utils/errors';
import { getCreateTaskPath } from '../../utils/project-paths';
import { parseTaskFiltersFromSearchParams } from '../../utils/task-filters';
import type { UserRole } from '../../types/api';

interface ProjectTasksSectionProps {
  projectId: string;
  role: UserRole;
  detailBasePath: string;
}

export function ProjectTasksSection({ projectId, role, detailBasePath }: ProjectTasksSectionProps) {
  const [searchParams] = useSearchParams();
  const { apiParams, hasActiveFilters } = parseTaskFiltersFromSearchParams(searchParams);
  const listParams = { ...apiParams, limit: 100 };
  const { data, isLoading, isError, error, refetch } = useProjectTasks(projectId, listParams);

  const subtitle = data ? `${data.pagination.total} task(s)` : undefined;

  return (
    <section className="project-tasks">
      <header className="project-tasks__header">
        <div>
          <h2 className="project-tasks__title">Tasks</h2>
          {subtitle ? <p className="project-tasks__subtitle">{subtitle}</p> : null}
        </div>
        <Link to={getCreateTaskPath(role, projectId)} className="btn btn--secondary btn--sm">
          Create task
        </Link>
      </header>

      <Card>
        <TaskFiltersBar />

        {isLoading ? (
          <TaskListSkeleton />
        ) : isError ? (
          <ErrorState
            title="Unable to load tasks"
            message={getAuthErrorMessage(error)}
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No tasks match filters"
              description="Try adjusting or clearing the filters to see more tasks."
            />
          ) : (
            <EmptyState
              title="No tasks yet"
              description="Create a task and assign it to a developer to track work on this project."
            />
          )
        ) : (
          <TaskList tasks={data.data} detailBasePath={detailBasePath} />
        )}
      </Card>
    </section>
  );
}
