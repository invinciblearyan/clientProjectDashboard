import './ManagerDashboardSkeleton.css';

export function ManagerDashboardSkeleton() {
  return (
    <div className="manager-dashboard-skeleton" aria-busy="true" aria-live="polite">
      <div className="manager-dashboard-skeleton__header">
        <div className="manager-dashboard-skeleton__line manager-dashboard-skeleton__line--title" />
        <div className="manager-dashboard-skeleton__line manager-dashboard-skeleton__line--subtitle" />
      </div>

      <div className="manager-dashboard-skeleton__stat" />

      <div className="manager-dashboard-skeleton__panel" />
      <div className="manager-dashboard-skeleton__panel manager-dashboard-skeleton__panel--tall" />
    </div>
  );
}
