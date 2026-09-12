import './ProjectListSkeleton.css';

export function ProjectListSkeleton() {
  return (
    <div className="project-list-skeleton" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="project-list-skeleton__row" />
      ))}
    </div>
  );
}
