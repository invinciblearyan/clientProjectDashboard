import { Link } from 'react-router-dom';
import type { Project } from '../../types/api';
import { formatDisplayDate } from '../../utils/format-dates';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import './ProjectList.css';

interface ProjectListProps {
  projects: Project[];
  detailBasePath: string;
}

export function ProjectList({ projects, detailBasePath }: ProjectListProps) {
  return (
    <ul className="project-list" aria-label="Projects">
      {projects.map((project) => (
        <li key={project.id} className="project-list__item">
          <div className="project-list__main">
            <h2 className="project-list__title">
              <Link to={`${detailBasePath}/${project.id}`} className="project-list__link">
                {project.name}
              </Link>
            </h2>
            <p className="project-list__client">
              {project.client.name}
              {project.client.company ? ` · ${project.client.company}` : ''}
            </p>
          </div>

          <div className="project-list__meta">
            <ProjectStatusBadge status={project.status} />
            <span className="project-list__dates">
              Start {formatDisplayDate(project.startDate)} · Due {formatDisplayDate(project.dueDate)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
