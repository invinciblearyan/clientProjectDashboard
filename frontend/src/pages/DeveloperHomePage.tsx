import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ActivityFeedSection } from '../components/activity/ActivityFeedSection';
import { AssignedTasksList } from '../components/dashboard/AssignedTasksList';
import { DeveloperDashboardSkeleton } from '../components/dashboard/DeveloperDashboardSkeleton';
import { useDeveloperDashboard } from '../hooks/useDeveloperDashboard';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import './DeveloperDashboard.css';

export function DeveloperHomePage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDeveloperDashboard();

  if (isLoading) {
    return <DeveloperDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="developer-dashboard">
        <header className="developer-dashboard__header">
          <h1 className="developer-dashboard__title">My Assigned Tasks</h1>
        </header>
        <ErrorState
          title="Unable to load assigned tasks"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="developer-dashboard">
      <header className="developer-dashboard__header">
        <h1 className="developer-dashboard__title">My Assigned Tasks</h1>
        <p className="developer-dashboard__subtitle">
          Tasks assigned to {user?.name ?? 'you'}. Order and scope are determined by the server
          dashboard API.
        </p>
      </header>

      <Card subtitle="Priority and due date ordering is defined by the backend">
        {data.assignedTasks.length === 0 ? (
          <EmptyState
            title="No tasks assigned"
            description="When tasks are assigned to you, they will appear here."
          />
        ) : (
          <AssignedTasksList tasks={data.assignedTasks} />
        )}
      </Card>

      <ActivityFeedSection
        title="My activity"
        subtitle="Updates for tasks assigned to you."
        limit={20}
      />
    </div>
  );
}
