import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { useActivity } from '../../hooks/useActivity';
import { getAuthErrorMessage } from '../../utils/errors';
import { formatActivityMessage, formatRelativeTime } from '../../utils/activity';
import './ActivityFeed.css';

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
  showProjectName?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ActivityFeed({
  projectId,
  limit = 20,
  showProjectName = false,
  emptyTitle = 'No activity yet',
  emptyDescription = 'Activity will appear here as work happens on tasks and projects.',
}: ActivityFeedProps) {
  const { data, isLoading, isError, error, refetch } = useActivity({ projectId, limit });

  if (isLoading) {
    return <LoadingState label="Loading activity…" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load activity"
        message={getAuthErrorMessage(error)}
        actionLabel="Try again"
        onAction={() => void refetch()}
      />
    );
  }

  const events = data?.data ?? [];

  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="activity-feed" aria-label="Activity feed">
      {events.map((event) => (
        <li key={event.id} className="activity-feed__item">
          <p className="activity-feed__message">{formatActivityMessage(event)}</p>
          <p className="activity-feed__meta">
            {showProjectName && event.project ? (
              <span className="activity-feed__project">{event.project.name}</span>
            ) : null}
            <time dateTime={event.createdAt}>{formatRelativeTime(event.createdAt)}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}
