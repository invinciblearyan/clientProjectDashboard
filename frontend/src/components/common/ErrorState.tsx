import type { ReactNode } from 'react';
import { Button } from './Button';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  actionLabel,
  onAction,
  children,
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <h2 className="error-state__title">{title}</h2>
      <p className="error-state__message">{message}</p>
      {children}
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
