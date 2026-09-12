import { ActivityFeedSection } from '../components/activity/ActivityFeedSection';

export function ActivityPage() {
  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="projects-page__title">Activity</h1>
          <p className="projects-page__subtitle">
            Global activity across all projects. Visibility is filtered by your role on the server.
          </p>
        </div>
      </header>

      <ActivityFeedSection
        title="Recent activity"
        subtitle="Historical activity from the database plus live updates over WebSocket."
        showProjectName
        limit={50}
      />
    </div>
  );
}
