import { Link } from 'react-router-dom';
import type { Task } from '../../types/api';
import { Badge } from '../common/Badge';
import { formatDisplayDate } from '../../utils/format-dates';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  detailBasePath: string;
}

export function TaskList({ tasks, detailBasePath }: TaskListProps) {
  return (
    <ul className="task-list" aria-label="Project tasks">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`task-list__item${task.isOverdue ? ' task-list__item--overdue' : ''}`}
        >
          <div className="task-list__main">
            <h3 className="task-list__title">
              <Link to={`${detailBasePath}/tasks/${task.id}`} className="task-list__link">
                {task.title}
              </Link>
            </h3>
            {task.description ? (
              <p className="task-list__description">{task.description}</p>
            ) : null}
            <p className="task-list__assignee">
              {task.assignee ? `Assigned to ${task.assignee.name}` : 'Unassigned'}
            </p>
          </div>

          <div className="task-list__meta">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            {task.isOverdue ? (
              <Badge variant="danger">Overdue</Badge>
            ) : null}
            <time className="task-list__due" dateTime={task.dueDate ?? undefined}>
              Due {formatDisplayDate(task.dueDate)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
