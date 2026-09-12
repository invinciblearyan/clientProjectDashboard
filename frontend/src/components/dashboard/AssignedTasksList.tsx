import { Link } from 'react-router-dom';
import type { DeveloperAssignedTask } from '../../types/api';
import { getDeveloperTaskDetailPath } from '../../utils/project-paths';
import { Badge } from '../common/Badge';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import './AssignedTasksList.css';

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return 'No due date';
  }

  return new Date(dueDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface AssignedTasksListProps {
  tasks: DeveloperAssignedTask[];
}

export function AssignedTasksList({ tasks }: AssignedTasksListProps) {
  return (
    <ul className="assigned-tasks" aria-label="Assigned tasks">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`assigned-tasks__item${task.isOverdue ? ' assigned-tasks__item--overdue' : ''}`}
        >
          <div className="assigned-tasks__main">
            <h2 className="assigned-tasks__title">
              <Link to={getDeveloperTaskDetailPath(task.id)} className="assigned-tasks__link">
                {task.title}
              </Link>
            </h2>
            <p className="assigned-tasks__project">{task.project.name}</p>
          </div>

          <div className="assigned-tasks__meta">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            {task.isOverdue ? (
              <Badge variant="danger">
                <span className="assigned-tasks__overdue-label">Overdue</span>
              </Badge>
            ) : null}
            <time className="assigned-tasks__due" dateTime={task.dueDate ?? undefined}>
              Due {formatDueDate(task.dueDate)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
