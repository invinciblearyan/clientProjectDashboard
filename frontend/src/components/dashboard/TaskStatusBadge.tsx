import type { TaskStatus } from '../../types/api';
import { Badge } from '../common/Badge';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const variant =
    status === 'DONE' ? 'success' : status === 'IN_REVIEW' ? 'accent' : 'neutral';

  return (
    <Badge variant={variant}>
      {STATUS_LABELS[status]} ({status.replace('_', ' ')})
    </Badge>
  );
}
