import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectListSkeleton } from '../components/projects/ProjectListSkeleton';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import { getCreateProjectPath, getProjectsBasePath } from '../utils/project-paths';
import './projects.css';

export function ProjectsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useProjects({ limit: 100 });

  if (!user) {
    return null;
  }

  const basePath = getProjectsBasePath(user.role);
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">Projects</h1>
          <p className="projects-page__subtitle">
            {isAdmin
              ? 'All projects across the workspace.'
              : 'Projects you created and manage.'}
          </p>
        </div>
        <Link to={getCreateProjectPath(user.role)} className="btn btn--secondary btn--sm">
          Create project
        </Link>
      </header>

      {isLoading ? (
        <ProjectListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Unable to load projects"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects yet"
            description={
              isAdmin
                ? 'Create a project and assign it to an existing client to get started.'
                : 'Create your first project and assign it to an existing client.'
            }
          />
        </Card>
      ) : (
        <Card title="Project list" subtitle={`${data.pagination.total} project(s)`}>
          <ProjectList projects={data.data} detailBasePath={basePath} />
        </Card>
      )}
    </div>
  );
}
