import './TaskListSkeleton.css';

export function TaskListSkeleton() {
  return (
    <div className="task-list-skeleton" aria-busy="true" aria-live="polite">
      <div className="task-list-skeleton__row" />
      <div className="task-list-skeleton__row" />
      <div className="task-list-skeleton__row" />
    </div>
  );
}
