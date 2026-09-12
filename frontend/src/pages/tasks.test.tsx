import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { developersApi } from '../api/developers.api';
import { projectsApi } from '../api/projects.api';
import { tasksApi } from '../api/tasks.api';
import { renderApp } from '../test/renderApp';
import {
  createDeveloperListResponse,
  createDeveloperOption,
  createProject,
  createSession,
  createTask,
  createTaskListResponse,
} from '../test/fixtures';
import { ApiRequestError } from '../types/api';

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

vi.mock('../api/developers.api', () => ({
  developersApi: {
    list: vi.fn(),
  },
}));

describe('Task management UI', () => {
  beforeEach(() => {
    vi.mocked(projectsApi.getById).mockResolvedValue({ data: createProject() });
    vi.mocked(tasksApi.list).mockResolvedValue(createTaskListResponse());
    vi.mocked(tasksApi.getById).mockResolvedValue({ data: createTask() });
    vi.mocked(tasksApi.create).mockResolvedValue({
      data: createTask({ id: 'task-created', title: 'New Task' }),
    });
    vi.mocked(developersApi.list).mockResolvedValue(createDeveloperListResponse());
  });

  it('allows admin to view project tasks on project detail', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Client Portal Redesign' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });

    expect(tasksApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', limit: 100 }),
    );
  });

  it('allows PM to view tasks for their own project', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));

    renderApp({ initialRoute: '/manager/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });
  });

  it('denies developer access to admin task management routes', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(tasksApi.list).not.toHaveBeenCalled();
    expect(tasksApi.create).not.toHaveBeenCalled();
  });

  it('shows task list loading skeleton while tasks are pending', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    let resolveList: ((value: ReturnType<typeof createTaskListResponse>) => void) | undefined;
    vi.mocked(tasksApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(document.querySelector('.task-list-skeleton')).toBeInTheDocument();
    });

    resolveList?.(createTaskListResponse());

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });
  });

  it('shows task list error state', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.list).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Tasks unavailable' }),
    );

    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByText('Tasks unavailable')).toBeInTheDocument();
    });
  });

  it('shows empty task list state', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.list).mockResolvedValue(createTaskListResponse([]));

    renderApp({ initialRoute: '/admin/projects/project-1' });

    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
  });

  it('validates required fields on task creation form', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading developers…')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Task title is required')).toBeInTheDocument();
    expect(tasksApi.create).not.toHaveBeenCalled();
  });

  it('loads developers for task assignment selection', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(developersApi.list).mockResolvedValue(
      createDeveloperListResponse([
        createDeveloperOption({ id: 'dev-a', name: 'Alpha Dev', email: 'alpha@example.com' }),
        createDeveloperOption({ id: 'dev-b', name: 'Beta Dev', email: 'beta@example.com' }),
      ]),
    );

    renderApp({ initialRoute: '/manager/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(developersApi.list).toHaveBeenCalled();
    });

    const developerSelect = screen.getByLabelText('Assigned developer') as HTMLSelectElement;
    const options = within(developerSelect).getAllByRole('option');
    expect(options.some((option) => option.textContent?.includes('Alpha Dev'))).toBe(true);
    expect(options.some((option) => option.textContent?.includes('Beta Dev'))).toBe(true);
  });

  it('creates a task and navigates to the new task detail page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.getById).mockResolvedValue({
      data: createTask({ id: 'task-created', title: 'New Task' }),
    });
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading developers…')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Task title'), 'New Task');
    await user.selectOptions(screen.getByLabelText('Assigned developer'), 'developer-1');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => {
      expect(vi.mocked(tasksApi.create).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          title: 'New Task',
          projectId: 'project-1',
          assigneeId: 'developer-1',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New Task' })).toBeInTheDocument();
    });
  });

  it('shows empty developer state on create task page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(developersApi.list).mockResolvedValue(createDeveloperListResponse([]));

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(screen.getByText('No developers available')).toBeInTheDocument();
    });
  });

  it('surfaces API errors from task creation', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.create).mockRejectedValue(
      new ApiRequestError(404, { code: 'NOT_FOUND', message: 'Developer not found' }),
    );
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading developers…')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Task title'), 'Broken Task');
    await user.selectOptions(screen.getByLabelText('Assigned developer'), 'developer-1');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => {
      expect(screen.getByText('Developer not found')).toBeInTheDocument();
    });
  });

  it('renders task detail from the API response', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.getById).mockResolvedValue({
      data: createTask({
        id: 'task-detail-1',
        title: 'Security review checklist',
        description: 'Complete the security review checklist.',
        isOverdue: true,
        assignee: createDeveloperOption({ name: 'Dev Two', email: 'dev2@example.com' }),
      }),
    });

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/task-detail-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Security review checklist' })).toBeInTheDocument();
    });

    expect(screen.getByText('Complete the security review checklist.')).toBeInTheDocument();
    expect(screen.getByText('Dev Two (dev2@example.com)')).toBeInTheDocument();
    expect(screen.getByText(/Client Portal Redesign · Overdue/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
  });
});
