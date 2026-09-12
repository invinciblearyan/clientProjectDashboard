import './AdminDashboardSkeleton.css';

export function AdminDashboardSkeleton() {
  return (
    <div className="admin-dashboard-skeleton" aria-busy="true" aria-live="polite">
      <div className="admin-dashboard-skeleton__header">
        <div className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--title" />
        <div className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--subtitle" />
      </div>

      <div className="admin-dashboard-skeleton__stats">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="admin-dashboard-skeleton__card" />
        ))}
      </div>

      <div className="admin-dashboard-skeleton__panel" />
    </div>
  );
}
