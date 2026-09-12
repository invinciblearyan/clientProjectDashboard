import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { projectsApi } from '../api/projects.api';
import { tasksApi } from '../api/tasks.api';
import { queryKeys } from '../api/queryKeys';
import { renderApp } from '../test/renderApp';
import { createProject, createSession, createTask, createTaskListResponse } from '../test/fixtures';

vi.mock('../api/auth.api', () => ({
  authApi: {
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('../api/dashboard.api', () => ({
  dashboardApi: {
    getDashboard: vi.fn(),
  },
}));

vi.mock('../api/projects.api', () => ({
  projectsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../api/tasks.api', () => ({
  tasksApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Task filters and URL query parameters', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.getById).mockResolvedValue({ data: createProject() });
    vi.mocked(tasksApi.list).mockResolvedValue(createTaskListResponse());
  });

  it('renders the task filter bar with no active filters by default', async () => {
    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', limit: 100 }),
    );
  });

  it('sends status filter parameters to the tasks API and URL', async () => {
    const user = userEvent.setup();
    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');

    await waitFor(() => {
      expect(tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          status: 'IN_PROGRESS',
          limit: 100,
        }),
      );
    });
  });

  it('sends priority filter parameters to the tasks API', async () => {
    const user = userEvent.setup();
    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');

    await waitFor(() => {
      expect(tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          priority: 'HIGH',
        }),
      );
    });
  });

  it('sends due-from filter parameters to the tasks API', async () => {
    renderApp({ initialRoute: '/admin/projects/project-1?dueFrom=2026-09-01' });

    await waitFor(() => {
      expect(tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          dueDateFrom: '2026-09-01T00:00:00.000Z',
        }),
      );
    });
  });

  it('sends due-to filter parameters to the tasks API', async () => {
    renderApp({ initialRoute: '/admin/projects/project-1?dueTo=2026-09-30' });

    await waitFor(() => {
      expect(tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          dueDateTo: '2026-09-30T23:59:59.999Z',
        }),
      );
    });
  });

  it('combines multiple filters in one request', async () => {
    renderApp({
      initialRoute:
        '/admin/projects/project-1?status=IN_REVIEW&priority=CRITICAL&dueFrom=2026-09-01&dueTo=2026-09-15',
    });

    await waitFor(() => {
      expect(tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          status: 'IN_REVIEW',
          priority: 'CRITICAL',
          dueDateFrom: '2026-09-01T00:00:00.000Z',
          dueDateTo: '2026-09-15T23:59:59.999Z',
          limit: 100,
        }),
      );
    });

    expect(screen.getByLabelText('Status')).toHaveValue('IN_REVIEW');
    expect(screen.getByLabelText('Priority')).toHaveValue('CRITICAL');
    expect(screen.getByLabelText('Due from')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Due to')).toHaveValue('2026-09-15');
  });

  it('restores filters when rendering from a shareable URL', async () => {
    renderApp({ initialRoute: '/admin/projects/project-1?status=DONE&priority=LOW' });

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toHaveValue('DONE');
    });

    expect(screen.getByLabelText('Priority')).toHaveValue('LOW');
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DONE',
        priority: 'LOW',
      }),
    );
  });

  it('clears filters from the URL and API request', async () => {
    const user = userEvent.setup();
    renderApp({ initialRoute: '/admin/projects/project-1?status=TODO&priority=MEDIUM' });

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toHaveValue('TODO');
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toHaveValue('');
      expect(screen.getByLabelText('Priority')).toHaveValue('');
    });

    expect(tasksApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        limit: 100,
      }),
    );
    expect(tasksApi.list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        status: 'TODO',
        priority: 'MEDIUM',
      }),
    );
  });

  it('handles invalid query parameters safely', async () => {
    renderApp({
      initialRoute:
        '/admin/projects/project-1?status=BLOCKED&priority=URGENT&dueFrom=bad-date&dueTo=2026-13-40',
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('');
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        limit: 100,
      }),
    );
  });

  it('shows a filtered empty state when no tasks match', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(createTaskListResponse([]));

    renderApp({ initialRoute: '/admin/projects/project-1?status=DONE' });

    await waitFor(() => {
      expect(screen.getByText('No tasks match filters')).toBeInTheDocument();
    });

    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
  });

  it('shows guidance when due-from is later than due-to', async () => {
    renderApp({ initialRoute: '/admin/projects/project-1?dueFrom=2026-09-30&dueTo=2026-09-01' });

    await waitFor(() => {
      expect(
        screen.getByText('Due from must be on or before due to. Date filters are ignored until corrected.'),
      ).toBeInTheDocument();
    });

    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        limit: 100,
      }),
    );
    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.not.objectContaining({
        dueDateFrom: expect.anything(),
        dueDateTo: expect.anything(),
      }),
    );
  });

  it('uses filter parameters in the TanStack Query key', async () => {
    const params = {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDateFrom: '2026-09-01T00:00:00.000Z',
      dueDateTo: '2026-09-30T23:59:59.999Z',
      limit: 100,
    };

    expect(queryKeys.tasks.byProject('project-1', params)).toEqual([
      'tasks',
      'byProject',
      'project-1',
      params,
    ]);
  });

  it('still renders filtered tasks from the API response', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(
      createTaskListResponse([
        createTask({ id: 'filtered-task', title: 'Filtered task only', status: 'DONE' }),
      ]),
    );

    renderApp({ initialRoute: '/admin/projects/project-1?status=DONE' });

    await waitFor(() => {
      expect(screen.getByText('Filtered task only')).toBeInTheDocument();
    });
  });
});
