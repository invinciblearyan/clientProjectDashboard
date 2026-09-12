import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { AdminDashboardSkeleton } from '../components/dashboard/AdminDashboardSkeleton';
import { StatCard } from '../components/dashboard/StatCard';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { useAuth } from '../hooks/useAuth';
import { getAuthErrorMessage } from '../utils/errors';
import './AdminDashboard.css';

export function AdminHomePage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAdminDashboard();

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="admin-dashboard">
        <header className="admin-dashboard__header">
          <h1 className="admin-dashboard__title">Dashboard</h1>
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
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Dashboard</h1>
        <p className="admin-dashboard__subtitle">
          Overview for {user?.name ?? 'Admin'}. Metrics are sourced from the server dashboard API.
        </p>
      </header>

      <section className="admin-dashboard__stats" aria-label="Key metrics">
        <StatCard label="Total projects" value={data.totalProjects} variant="accent" />
        <StatCard
          label="Overdue tasks"
          value={data.overdueTaskCount}
          variant="danger"
          description="Tasks marked overdue by the system"
        />
        <StatCard
          label="Active users online"
          value={data.activeUsersOnline}
          description="Live connected users via WebSocket presence"
        />
      </section>

      <Card title="Task status overview" subtitle="All tasks grouped by current status">
        <StatusBreakdown counts={data.tasksByStatus} />
      </Card>
    </div>
  );
}
