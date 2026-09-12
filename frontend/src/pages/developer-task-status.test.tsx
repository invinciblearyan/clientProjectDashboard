import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { tasksApi } from '../api/tasks.api';
import { renderApp } from '../test/renderApp';
import {
  createDeveloperDashboard,
  createDeveloperTask,
  createSession,
  createTask,
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

vi.mock('../api/tasks.api', () => ({
  tasksApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Developer task status updates', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard(),
    });
    vi.mocked(tasksApi.getById).mockResolvedValue({
      data: createDeveloperTask(),
    });
    vi.mocked(tasksApi.update).mockResolvedValue({
      data: createDeveloperTask({ status: 'IN_REVIEW' }),
    });
  });

  it('links assigned tasks to the developer task detail page', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Implement login flow' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Implement login flow' })).toHaveAttribute(
      'href',
      '/developer/tasks/task-assigned-1',
    );
  });

  it('shows status control for an assigned task', async () => {
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Implement login flow' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Task status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update status' })).toBeInTheDocument();
  });

  it('displays the current task status', async () => {
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByText(/In progress \(IN PROGRESS\)/)).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Task status')).toHaveValue('IN_PROGRESS');
  });

  it('allows selecting another valid status and updates through the API', async () => {
    vi.mocked(tasksApi.getById)
      .mockResolvedValueOnce({ data: createDeveloperTask() })
      .mockResolvedValueOnce({ data: createDeveloperTask({ status: 'IN_REVIEW' }) });

    const user = userEvent.setup();
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task status')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Task status'), 'IN_REVIEW');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    await waitFor(() => {
      expect(vi.mocked(tasksApi.update).mock.calls[0]?.[0]).toBe('task-assigned-1');
      expect(vi.mocked(tasksApi.update).mock.calls[0]?.[1]).toEqual({ status: 'IN_REVIEW' });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Task status')).toHaveValue('IN_REVIEW');
    });
  });

  it('disables update while the mutation is pending', async () => {
    let resolveUpdate:
      | ((value: { data: ReturnType<typeof createDeveloperTask> }) => void)
      | undefined;

    vi.mocked(tasksApi.update).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const user = userEvent.setup();
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task status')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Task status'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    expect(screen.getByLabelText('Task status')).toBeDisabled();

    resolveUpdate?.({ data: createDeveloperTask({ status: 'DONE' }) });

    await waitFor(() => {
      expect(screen.getByLabelText('Task status')).toHaveValue('DONE');
    });
  });

  it('surfaces API errors from status updates', async () => {
    vi.mocked(tasksApi.update).mockRejectedValue(
      new ApiRequestError(403, { code: 'FORBIDDEN', message: 'Developers may only update task status' }),
    );

    const user = userEvent.setup();
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByLabelText('Task status')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Task status'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    await waitFor(() => {
      expect(screen.getByText('Developers may only update task status')).toBeInTheDocument();
    });
  });

  it('does not expose editable status controls on admin task detail', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(tasksApi.getById).mockResolvedValue({ data: createTask() });

    renderApp({ initialRoute: '/admin/projects/project-1/tasks/task-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Implement login flow' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Task status')).not.toBeInTheDocument();
  });

  it('does not expose editable status controls on PM task detail', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(tasksApi.getById).mockResolvedValue({ data: createTask() });

    renderApp({ initialRoute: '/manager/projects/project-1/tasks/task-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Implement login flow' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
  });

  it('does not expose unrelated editable task fields to developers', async () => {
    renderApp({ initialRoute: '/developer/tasks/task-assigned-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Implement login flow' })).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Priority')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assigned developer')).not.toBeInTheDocument();
  });

  it('keeps the developer dashboard task list intact', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Assigned Tasks' })).toBeInTheDocument();
    });

    const taskList = screen.getByLabelText('Assigned tasks');
    const items = within(taskList).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]!).getByText('Implement login flow')).toBeInTheDocument();
  });
});
