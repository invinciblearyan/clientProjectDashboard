import type { TaskStatus } from '../../types/api';
import { Badge } from '../common/Badge';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

const STATUS_VARIANTS: Record<TaskStatus, 'neutral' | 'accent' | 'success'> = {
  TODO: 'neutral',
  IN_PROGRESS: 'accent',
  IN_REVIEW: 'accent',
  DONE: 'success',
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]} ({status.replace('_', ' ')})
    </Badge>
  );
}

export const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'DONE', label: 'Done' },
];
