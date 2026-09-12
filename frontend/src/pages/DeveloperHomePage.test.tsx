import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { renderApp } from '../test/renderApp';
import { createDeveloperDashboard, createSession } from '../test/fixtures';
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

describe('Developer dashboard', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard(),
    });
  });

  it('renders the developer dashboard', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Assigned Tasks' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Assigned tasks')).toBeInTheDocument();
  });

  it('displays assigned task titles from the API response', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });

    expect(screen.getByText('Security patch deployment')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByText('Update documentation')).toBeInTheDocument();
  });

  it('displays project names from the API response', async () => {
    renderApp({ initialRoute: '/developer' });

    const taskList = await screen.findByLabelText('Assigned tasks');

    expect(within(taskList).getAllByText('Client Portal Redesign').length).toBe(2);
    expect(within(taskList).getByText('Mobile App MVP')).toBeInTheDocument();
    expect(within(taskList).getByText('Internal Analytics Dashboard')).toBeInTheDocument();
  });

  it('renders all priority types including CRITICAL', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });

  it('renders readable status labels', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText(/In progress \(IN PROGRESS\)/)).toBeInTheDocument();
    });

    expect(screen.getByText(/To do \(TODO\)/)).toBeInTheDocument();
    expect(screen.getByText(/In review \(IN REVIEW\)/)).toBeInTheDocument();
    expect(screen.getByText(/Done \(DONE\)/)).toBeInTheDocument();
  });

  it('renders due dates', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getAllByText(/^Due /).length).toBeGreaterThan(0);
    });
  });

  it('shows an overdue indication when isOverdue is true', async () => {
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('Security patch deployment')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Overdue').length).toBe(1);
  });

  it('does not show overdue indication for non-overdue tasks', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard({
        assignedTasks: [
          {
            id: 'task-not-overdue',
            title: 'Fresh task',
            status: 'TODO',
            priority: 'LOW',
            dueDate: '2026-09-30T00:00:00.000Z',
            isOverdue: false,
            project: { id: 'project-1', name: 'Client Portal Redesign' },
          },
        ],
      }),
    });

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('Fresh task')).toBeInTheDocument();
    });

    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('renders an empty state when no tasks are assigned', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard({ assignedTasks: [] }),
    });

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('No tasks assigned')).toBeInTheDocument();
    });
  });

  it('shows a loading skeleton while the dashboard request is pending', async () => {
    let resolveDashboard:
      | ((value: { data: ReturnType<typeof createDeveloperDashboard> }) => void)
      | undefined;

    vi.mocked(dashboardApi.getDashboard).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDashboard = resolve;
        }),
    );

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(document.querySelector('.developer-dashboard-skeleton')).toBeInTheDocument();
    });

    expect(screen.queryByText('Implement login flow')).not.toBeInTheDocument();

    resolveDashboard?.({ data: createDeveloperDashboard() });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });
  });

  it('shows an error state when the API fails', async () => {
    vi.mocked(dashboardApi.getDashboard).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
    );

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No tasks assigned')).not.toBeInTheDocument();
  });

  it('retries loading the dashboard when Try again is clicked', async () => {
    vi.mocked(dashboardApi.getDashboard)
      .mockRejectedValueOnce(
        new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
      )
      .mockResolvedValueOnce({
        data: createDeveloperDashboard({
          assignedTasks: [
            {
              id: 'retry-task',
              title: 'Retry loaded task',
              status: 'TODO',
              priority: 'HIGH',
              dueDate: '2026-09-18T00:00:00.000Z',
              isOverdue: false,
              project: { id: 'project-1', name: 'Client Portal Redesign' },
            },
          ],
        }),
      });

    const user = userEvent.setup();
    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Retry loaded task')).toBeInTheDocument();
    });

    expect(dashboardApi.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('preserves the task order returned by the API', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard({
        assignedTasks: [
          {
            id: 'order-1',
            title: 'First critical task',
            status: 'TODO',
            priority: 'CRITICAL',
            dueDate: '2026-09-20T00:00:00.000Z',
            isOverdue: false,
            project: { id: 'p1', name: 'Project Alpha' },
          },
          {
            id: 'order-2',
            title: 'Second high task',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: '2026-09-10T00:00:00.000Z',
            isOverdue: false,
            project: { id: 'p2', name: 'Project Beta' },
          },
          {
            id: 'order-3',
            title: 'Third low task',
            status: 'DONE',
            priority: 'LOW',
            dueDate: '2026-09-05T00:00:00.000Z',
            isOverdue: false,
            project: { id: 'p3', name: 'Project Gamma' },
          },
        ],
      }),
    });

    renderApp({ initialRoute: '/developer' });

    const taskList = await screen.findByLabelText('Assigned tasks');
    const items = within(taskList).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(within(items[0]).getByRole('heading', { name: 'First critical task' })).toBeInTheDocument();
    expect(within(items[1]).getByRole('heading', { name: 'Second high task' })).toBeInTheDocument();
    expect(within(items[2]).getByRole('heading', { name: 'Third low task' })).toBeInTheDocument();
  });

  it('renders exactly the authorized tasks returned by the API response', async () => {
    const authorizedTasks = createDeveloperDashboard({
      assignedTasks: [
        {
          id: 'dev-task-only',
          title: 'Authorized developer task',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          dueDate: '2026-09-14T00:00:00.000Z',
          isOverdue: false,
          project: { id: 'owned-project', name: 'Owned Project' },
        },
      ],
    });

    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({ data: authorizedTasks });

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByText('Authorized developer task')).toBeInTheDocument();
    });

    expect(screen.getByText('Owned Project')).toBeInTheDocument();
    expect(screen.queryByText('Security patch deployment')).not.toBeInTheDocument();
    expect(dashboardApi.getDashboard).toHaveBeenCalledWith();
  });
});
