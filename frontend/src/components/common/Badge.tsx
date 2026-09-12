import type { ReactNode } from 'react';
import './Badge.css';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'danger';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
