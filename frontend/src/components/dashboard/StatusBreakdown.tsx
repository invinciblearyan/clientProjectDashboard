import type { TaskStatusCounts } from '../../types/api';
import './StatusBreakdown.css';

const STATUS_ITEMS: Array<{
  key: keyof TaskStatusCounts;
  label: string;
  modifier: string;
}> = [
  { key: 'TODO', label: 'To do', modifier: 'todo' },
  { key: 'IN_PROGRESS', label: 'In progress', modifier: 'in-progress' },
  { key: 'IN_REVIEW', label: 'In review', modifier: 'in-review' },
  { key: 'DONE', label: 'Done', modifier: 'done' },
];

interface StatusBreakdownProps {
  counts: TaskStatusCounts;
}

export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  const totalTasks = STATUS_ITEMS.reduce((sum, item) => sum + counts[item.key], 0);

  return (
    <div className="status-breakdown">
      <p className="status-breakdown__summary">
        <span className="status-breakdown__summary-label">Total tasks</span>
        <span className="status-breakdown__summary-value">{totalTasks.toLocaleString()}</span>
      </p>

      <ul className="status-breakdown__list" aria-label="Task counts by status">
        {STATUS_ITEMS.map((item) => (
          <li key={item.key} className={`status-breakdown__item status-breakdown__item--${item.modifier}`}>
            <span className="status-breakdown__status">
              <span className="status-breakdown__indicator" aria-hidden="true" />
              <span>{item.label}</span>
              <span className="status-breakdown__code">({item.key.replace('_', ' ')})</span>
            </span>
            <span className="status-breakdown__count">{counts[item.key].toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
