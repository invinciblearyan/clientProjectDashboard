import type { ManagerDashboardUpcomingTask } from '../../types/api';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import './UpcomingTasksList.css';

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

interface UpcomingTasksListProps {
  tasks: ManagerDashboardUpcomingTask[];
}

export function UpcomingTasksList({ tasks }: UpcomingTasksListProps) {
  return (
    <ul className="upcoming-tasks" aria-label="Upcoming tasks due this week">
      {tasks.map((task) => (
        <li key={task.id} className="upcoming-tasks__item">
          <div className="upcoming-tasks__main">
            <p className="upcoming-tasks__title">{task.title}</p>
            <p className="upcoming-tasks__project">{task.project.name}</p>
          </div>

          <div className="upcoming-tasks__meta">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            <time className="upcoming-tasks__due" dateTime={task.dueDate ?? undefined}>
              Due {formatDueDate(task.dueDate)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
