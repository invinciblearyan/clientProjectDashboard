import { Link, useParams } from 'react-router-dom';
import { ActivityFeedSection } from '../components/activity/ActivityFeedSection';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { ProjectPresenceIndicator } from '../components/projects/ProjectPresenceIndicator';
import { ProjectStatusBadge } from '../components/projects/ProjectStatusBadge';
import { ProjectTasksSection } from '../components/tasks/ProjectTasksSection';
import { useProject } from '../hooks/useProject';
import { useProjectPresence } from '../hooks/useProjectPresence';
import { useProjectRealtime } from '../hooks/useProjectRealtime';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import { formatDisplayDate } from '../utils/format-dates';
import { getProjectsBasePath } from '../utils/project-paths';
import './projects.css';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProject(projectId);

  const canUseProjectRealtime =
    Boolean(user) &&
    Boolean(projectId) &&
    (user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') &&
    !isLoading &&
    !isError &&
    Boolean(data);

  useProjectRealtime(projectId, canUseProjectRealtime);
  const viewers = useProjectPresence(projectId, canUseProjectRealtime);

  if (!user) {
    return null;
  }

  const basePath = getProjectsBasePath(user.role);

  if (isLoading) {
    return (
      <div className="projects-page">
        <LoadingState label="Loading project…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="projects-page">
        <header className="projects-page__header">
          <h1 className="projects-page__title">Project details</h1>
        </header>
        <ErrorState
          title="Unable to load project"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  const project = data.data;

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">{project.name}</h1>
          <p className="projects-page__subtitle">
            {project.client.name}
            {project.client.company ? ` · ${project.client.company}` : ''}
          </p>
          <ProjectPresenceIndicator viewers={viewers} />
        </div>
        <Link to={basePath} className="btn btn--ghost btn--sm">
          Back to projects
        </Link>
      </header>

      <Card title="Project information">
        <dl className="project-detail">
          <div className="project-detail__row">
            <dt>Status</dt>
            <dd>
              <ProjectStatusBadge status={project.status} />
            </dd>
          </div>
          <div className="project-detail__row">
            <dt>Client</dt>
            <dd>{project.client.name}</dd>
          </div>
          {project.client.contactEmail ? (
            <div className="project-detail__row">
              <dt>Client contact</dt>
              <dd>{project.client.contactEmail}</dd>
            </div>
          ) : null}
          <div className="project-detail__row">
            <dt>Start date</dt>
            <dd>{formatDisplayDate(project.startDate)}</dd>
          </div>
          <div className="project-detail__row">
            <dt>Due date</dt>
            <dd>{formatDisplayDate(project.dueDate)}</dd>
          </div>
          <div className="project-detail__row">
            <dt>Created</dt>
            <dd>{formatDisplayDate(project.createdAt)}</dd>
          </div>
          <div className="project-detail__row">
            <dt>Last updated</dt>
            <dd>{formatDisplayDate(project.updatedAt)}</dd>
          </div>
          {project.description ? (
            <div className="project-detail__row project-detail__row--full">
              <dt>Description</dt>
              <dd>{project.description}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <ProjectTasksSection
        projectId={project.id}
        role={user.role}
        detailBasePath={basePath}
      />

      <ActivityFeedSection
        projectId={project.id}
        title="Project activity"
        subtitle="Historical activity for this project plus live updates."
        showProjectName={false}
      />
    </div>
  );
}
