import './DeveloperDashboardSkeleton.css';

export function DeveloperDashboardSkeleton() {
  return (
    <div className="developer-dashboard-skeleton" aria-busy="true" aria-live="polite">
      <div className="developer-dashboard-skeleton__header">
        <div className="developer-dashboard-skeleton__line developer-dashboard-skeleton__line--title" />
        <div className="developer-dashboard-skeleton__line developer-dashboard-skeleton__line--subtitle" />
      </div>

      <div className="developer-dashboard-skeleton__list">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="developer-dashboard-skeleton__row" />
        ))}
      </div>
    </div>
  );
}
