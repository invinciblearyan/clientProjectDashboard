import { Link, useParams } from 'react-router-dom';
import { CreateTaskForm } from '../components/tasks/CreateTaskForm';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { getProjectDetailPath } from '../utils/project-paths';
import './projects.css';

export function CreateTaskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data: projectResponse } = useProject(projectId);

  if (!user || !projectId) {
    return null;
  }

  const projectName = projectResponse?.data.name ?? 'Project';

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">Create task</h1>
          <p className="projects-page__subtitle">
            Add a task to {projectName}. Task access is enforced by the server.
          </p>
        </div>
        <Link to={getProjectDetailPath(user.role, projectId)} className="btn btn--ghost btn--sm">
          Back to project
        </Link>
      </header>

      <CreateTaskForm projectId={projectId} />
    </div>
  );
}
