import { Link } from 'react-router-dom';
import { CreateProjectForm } from '../components/projects/CreateProjectForm';
import { useAuth } from '../hooks/useAuth';
import { getProjectsBasePath } from '../utils/project-paths';
import './projects.css';

export function CreateProjectPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const basePath = getProjectsBasePath(user.role);

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">Create project</h1>
          <p className="projects-page__subtitle">
            Assign a new project to an existing client. Project access is enforced by the server.
          </p>
        </div>
        <Link to={basePath} className="btn btn--ghost btn--sm">
          Back to projects
        </Link>
      </header>

      <CreateProjectForm />
    </div>
  );
}
