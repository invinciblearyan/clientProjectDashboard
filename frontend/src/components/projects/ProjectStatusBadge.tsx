import type { ProjectStatus } from '../../types/api';
import { Badge } from '../common/Badge';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_VARIANTS: Record<ProjectStatus, 'neutral' | 'accent' | 'success' | 'danger'> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'accent',
  ON_HOLD: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]} ({status.replace('_', ' ')})
    </Badge>
  );
}

export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
