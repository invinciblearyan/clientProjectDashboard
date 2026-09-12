import type { ActivityEvent, TaskStatus } from '../types/api';
import type { ActivityEventPayload } from '../websocket/socketEvents';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

export function formatTaskStatusLabel(status: TaskStatus | string): string {
  return STATUS_LABELS[status as TaskStatus] ?? status.replaceAll('_', ' ').toLowerCase();
}

export function formatActivityMessage(event: ActivityEvent | ActivityEventPayload): string {
  if (
    event.type === 'TASK_STATUS_CHANGED' &&
    event.task &&
    event.previousStatus &&
    event.newStatus
  ) {
    const actor = event.actor?.name ?? 'Someone';
    return `${actor} moved ${event.task.title} from ${formatTaskStatusLabel(event.previousStatus)} → ${formatTaskStatusLabel(event.newStatus)}`;
  }

  return event.summary;
}

export function formatRelativeTime(isoDate: string, now = Date.now()): string {
  const timestamp = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function mergeActivityEvents(
  existing: ActivityEvent[],
  incoming: ActivityEvent[],
): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();

  for (const event of [...existing, ...incoming]) {
    byId.set(event.id, event);
  }

  return Array.from(byId.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function toActivityEvent(payload: ActivityEventPayload): ActivityEvent {
  return {
    ...payload,
    previousStatus: payload.previousStatus as ActivityEvent['previousStatus'],
    newStatus: payload.newStatus as ActivityEvent['newStatus'],
  };
}
