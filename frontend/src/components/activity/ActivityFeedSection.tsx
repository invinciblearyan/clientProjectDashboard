import { Card } from '../common/Card';
import { ActivityFeed } from './ActivityFeed';

interface ActivityFeedSectionProps {
  title?: string;
  subtitle?: string;
  projectId?: string;
  limit?: number;
  showProjectName?: boolean;
}

export function ActivityFeedSection({
  title = 'Activity',
  subtitle = 'Recent updates from persisted activity logs and live events.',
  projectId,
  limit = 20,
  showProjectName = !projectId,
}: ActivityFeedSectionProps) {
  return (
    <Card title={title} subtitle={subtitle}>
      <ActivityFeed projectId={projectId} limit={limit} showProjectName={showProjectName} />
    </Card>
  );
}
