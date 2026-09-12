import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ActivityFeedSection } from '../components/activity/ActivityFeedSection';
import { ManagerDashboardSkeleton } from '../components/dashboard/ManagerDashboardSkeleton';
import { PriorityBreakdown } from '../components/dashboard/PriorityBreakdown';
import { StatCard } from '../components/dashboard/StatCard';
import { UpcomingTasksList } from '../components/dashboard/UpcomingTasksList';
import { useManagerDashboard } from '../hooks/useManagerDashboard';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import './ManagerDashboard.css';

export function ManagerHomePage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useManagerDashboard();

  if (isLoading) {
    return <ManagerDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="manager-dashboard">
        <header className="manager-dashboard__header">
          <h1 className="manager-dashboard__title">Dashboard</h1>
        </header>
        <ErrorState
          title="Unable to load dashboard"
          message={getAuthErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <header className="manager-dashboard__header">
        <h1 className="manager-dashboard__title">Dashboard</h1>
        <p className="manager-dashboard__subtitle">
          Overview for {user?.name ?? 'Project Manager'}. Metrics reflect your owned projects
          only.
        </p>
      </header>

      <div className="manager-dashboard__stat">
        <StatCard
          label="Your projects"
          value={data.projectCount}
          variant="accent"
          description="Projects you created"
        />
      </div>

      <Card title="Tasks by priority" subtitle="Tasks across your projects grouped by priority">
        <PriorityBreakdown counts={data.tasksByPriority} />
      </Card>

      <Card
        title="Upcoming due this week"
        subtitle="Non-completed tasks due Monday through Sunday (server-defined week)"
      >
        {data.upcomingDueThisWeek.length === 0 ? (
          <EmptyState
            title="No upcoming tasks this week"
            description="Tasks with due dates in the current week will appear here."
          />
        ) : (
          <UpcomingTasksList tasks={data.upcomingDueThisWeek} />
        )}
      </Card>

      <ActivityFeedSection
        title="Recent activity"
        subtitle="Activity across your owned projects."
        showProjectName
      />
    </div>
  );
}
