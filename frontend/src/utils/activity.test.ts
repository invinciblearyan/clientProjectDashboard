import { describe, expect, it } from 'vitest';
import {
  formatActivityMessage,
  formatRelativeTime,
  mergeActivityEvents,
} from './activity';
import { createActivityEvent } from '../test/fixtures';

describe('activity utils', () => {
  it('formats status transition activity in human-readable form', () => {
    const message = formatActivityMessage(createActivityEvent());

    expect(message).toBe('Ravi moved Design homepage from In progress → In review');
  });

  it('formats relative timestamps', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60_000).toISOString();
    expect(formatRelativeTime(twoMinutesAgo)).toBe('2 mins ago');
  });

  it('merges activity without duplicates and preserves chronological order', () => {
    const older = createActivityEvent({
      id: 'activity-old',
      createdAt: '2026-09-01T10:00:00.000Z',
    });
    const newer = createActivityEvent({
      id: 'activity-new',
      createdAt: '2026-09-02T10:00:00.000Z',
    });

    const merged = mergeActivityEvents([older, newer], [older, newer]);

    expect(merged.map((event) => event.id)).toEqual(['activity-new', 'activity-old']);
  });
});
