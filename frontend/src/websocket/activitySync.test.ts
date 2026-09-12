import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import type { ActivityListResponse } from '../types/api';
import { createActivityEvent, createActivityListResponse } from '../test/fixtures';
import { appendActivityEvents } from './activitySync';

describe('appendActivityEvents', () => {
  it('appends live events to global and project activity caches', () => {
    const queryClient = new QueryClient();
    const initial = createActivityListResponse([
      createActivityEvent({ id: 'activity-existing' }),
    ]);

    queryClient.setQueryData(queryKeys.activity.list({}), initial);
    queryClient.setQueryData(
      queryKeys.activity.list({ projectId: 'project-1' }),
      initial,
    );

    appendActivityEvents(queryClient, [
      {
        ...createActivityEvent({ id: 'activity-live' }),
      },
    ]);

    const global = queryClient.getQueryData<ActivityListResponse>(queryKeys.activity.list({}));
    const project = queryClient.getQueryData<ActivityListResponse>(
      queryKeys.activity.list({ projectId: 'project-1' }),
    );

    expect(global?.data.map((event) => event.id)).toEqual(['activity-live', 'activity-existing']);
    expect(project?.data.map((event) => event.id)).toEqual(['activity-live', 'activity-existing']);
  });

  it('deduplicates catch-up events by activity id', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      queryKeys.activity.list({}),
      createActivityListResponse([
        createActivityEvent({
          id: 'activity-1',
          createdAt: '2026-09-01T10:00:00.000Z',
        }),
      ]),
    );

    appendActivityEvents(queryClient, [
      {
        ...createActivityEvent({ id: 'activity-1' }),
      },
      {
        ...createActivityEvent({
          id: 'activity-2',
          createdAt: '2026-09-02T10:00:00.000Z',
        }),
      },
    ]);

    const global = queryClient.getQueryData<ActivityListResponse>(queryKeys.activity.list({}));
    expect(global?.data).toHaveLength(2);
    expect(global?.data.map((event) => event.id)).toEqual(['activity-1', 'activity-2']);
  });
});
