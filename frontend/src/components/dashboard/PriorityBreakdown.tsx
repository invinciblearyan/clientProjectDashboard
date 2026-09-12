import type { TaskPriorityCounts } from '../../types/api';
import './PriorityBreakdown.css';

const PRIORITY_ITEMS: Array<{
  key: keyof TaskPriorityCounts;
  label: string;
  modifier: string;
}> = [
  { key: 'CRITICAL', label: 'Critical', modifier: 'critical' },
  { key: 'HIGH', label: 'High', modifier: 'high' },
  { key: 'MEDIUM', label: 'Medium', modifier: 'medium' },
  { key: 'LOW', label: 'Low', modifier: 'low' },
];

interface PriorityBreakdownProps {
  counts: TaskPriorityCounts;
}

export function PriorityBreakdown({ counts }: PriorityBreakdownProps) {
  const totalTasks = PRIORITY_ITEMS.reduce((sum, item) => sum + counts[item.key], 0);

  return (
    <div className="priority-breakdown">
      <p className="priority-breakdown__summary">
        <span className="priority-breakdown__summary-label">Total tasks</span>
        <span className="priority-breakdown__summary-value">{totalTasks.toLocaleString()}</span>
      </p>

      <ul className="priority-breakdown__list" aria-label="Task counts by priority">
        {PRIORITY_ITEMS.map((item) => (
          <li
            key={item.key}
            className={`priority-breakdown__item priority-breakdown__item--${item.modifier}`}
          >
            <span className="priority-breakdown__priority">
              <span className="priority-breakdown__indicator" aria-hidden="true" />
              <span>{item.label}</span>
              <span className="priority-breakdown__code">({item.key})</span>
            </span>
            <span className="priority-breakdown__count">{counts[item.key].toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
