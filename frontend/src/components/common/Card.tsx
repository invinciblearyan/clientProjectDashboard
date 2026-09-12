import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function Card({ children, title, subtitle, className = '' }: CardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      {title || subtitle ? (
        <header className="card__header">
          {title ? <h2 className="card__title">{title}</h2> : null}
          {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="card__body">{children}</div>
    </section>
  );
}
