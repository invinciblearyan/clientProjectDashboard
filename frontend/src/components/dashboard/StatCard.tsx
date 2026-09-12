import './StatCard.css';

type StatCardVariant = 'default' | 'accent' | 'danger';

interface StatCardProps {
  label: string;
  value: number;
  variant?: StatCardVariant;
  description?: string;
}

export function StatCard({
  label,
  value,
  variant = 'default',
  description,
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${variant}`} aria-labelledby={`stat-${label}`}>
      <p id={`stat-${label}`} className="stat-card__label">
        {label}
      </p>
      <p className="stat-card__value" aria-label={`${label}: ${value}`}>
        {value.toLocaleString()}
      </p>
      {description ? <p className="stat-card__description">{description}</p> : null}
    </article>
  );
}
