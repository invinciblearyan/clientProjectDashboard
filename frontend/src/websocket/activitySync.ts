import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { ActivityListResponse } from '../types/api';
import { mergeActivityEvents, toActivityEvent } from '../utils/activity';
import type { ActivityEventPayload } from './socketEvents';

export function appendActivityEvents(
  queryClient: QueryClient,
  payloads: ActivityEventPayload[],
): void {
  const events = payloads.map(toActivityEvent);

  queryClient.setQueriesData<ActivityListResponse>(
    { queryKey: queryKeys.activity.all },
    (current) => {
      if (!current) {
        return current;
      }

      const merged = mergeActivityEvents(current.data, events);

      return {
        ...current,
        data: merged,
        pagination: {
          ...current.pagination,
          total: Math.max(current.pagination.total, merged.length),
        },
      };
    },
  );
}

export function activityMatchesProjectFilter(
  event: ActivityEventPayload,
  projectId: string | undefined,
): boolean {
  if (!projectId) {
    return true;
  }

  return event.projectId === projectId;
}
