import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import { invalidateTaskStatusQueries } from './taskStatusSync';

describe('invalidateTaskStatusQueries', () => {
  it('invalidates task detail, project task list, and task root queries', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateTaskStatusQueries(queryClient, {
      taskId: 'task-42',
      projectId: 'project-7',
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.tasks.detail('task-42'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.tasks.byProject('project-7'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.tasks.all,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.developer,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard.manager,
    });
  });
});
