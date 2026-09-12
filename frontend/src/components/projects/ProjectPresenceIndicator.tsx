import './ProjectPresenceIndicator.css';

interface ProjectPresenceIndicatorProps {
  viewers: Array<{ id: string; name: string }>;
}

export function ProjectPresenceIndicator({ viewers }: ProjectPresenceIndicatorProps) {
  if (viewers.length === 0) {
    return null;
  }

  const label =
    viewers.length === 1
      ? `${viewers[0].name} viewing`
      : `${viewers.length} people viewing`;

  return (
    <p className="project-presence" aria-label={label}>
      <span className="project-presence__dot" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
