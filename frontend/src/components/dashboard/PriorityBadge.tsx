import type { TaskPriority } from '../../types/api';
import { Badge } from '../common/Badge';
import './PriorityBadge.css';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_VARIANTS: Record<TaskPriority, 'danger' | 'accent' | 'neutral'> = {
  CRITICAL: 'danger',
  HIGH: 'accent',
  MEDIUM: 'neutral',
  LOW: 'neutral',
};

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority]}>
      <span className="priority-badge">
        <span className="priority-badge__code" aria-hidden="true">
          {priority}
        </span>
        <span>{PRIORITY_LABELS[priority]}</span>
      </span>
    </Badge>
  );
}
