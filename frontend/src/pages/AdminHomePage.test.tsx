import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { renderApp } from '../test/renderApp';
import { createAdminDashboard, createSession } from '../test/fixtures';
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

describe('Admin dashboard', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard(),
    });
  });

  it('renders dashboard data correctly for admin users', async () => {
    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Total projects: 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Overdue tasks: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Active users online: 5')).toBeInTheDocument();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('In review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('displays total projects', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard({ totalProjects: 7 }),
    });

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByLabelText('Total projects: 7')).toBeInTheDocument();
    });
  });

  it('displays all four task statuses', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard({
        overdueTaskCount: 0,
        tasksByStatus: {
          TODO: 1,
          IN_PROGRESS: 2,
          IN_REVIEW: 3,
          DONE: 4,
        },
      }),
    });

    renderApp({ initialRoute: '/admin' });

    const statusList = await screen.findByLabelText('Task counts by status');
    const items = within(statusList).getAllByRole('listitem');

    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('1')).toBeInTheDocument();
    expect(within(items[1]).getByText('2')).toBeInTheDocument();
    expect(within(items[2]).getByText('3')).toBeInTheDocument();
    expect(within(items[3]).getByText('4')).toBeInTheDocument();
  });

  it('displays overdue count', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard({ overdueTaskCount: 9 }),
    });

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByLabelText('Overdue tasks: 9')).toBeInTheDocument();
    });
  });

  it('displays active users online', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard({ activeUsersOnline: 2 }),
    });

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByLabelText('Active users online: 2')).toBeInTheDocument();
    });
  });

  it('shows a loading skeleton while the dashboard request is pending', async () => {
    let resolveDashboard: ((value: { data: ReturnType<typeof createAdminDashboard> }) => void) | undefined;
    vi.mocked(dashboardApi.getDashboard).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDashboard = resolve;
        }),
    );

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(document.querySelector('.admin-dashboard-skeleton')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Total projects: 12')).not.toBeInTheDocument();

    resolveDashboard?.({ data: createAdminDashboard() });

    await waitFor(() => {
      expect(screen.getByLabelText('Total projects: 12')).toBeInTheDocument();
    });
  });

  it('shows an error state instead of zero metrics when the API fails', async () => {
    vi.mocked(dashboardApi.getDashboard).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
    );

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Total projects: 0')).not.toBeInTheDocument();
  });

  it('retries loading the dashboard when Try again is clicked', async () => {
    vi.mocked(dashboardApi.getDashboard)
      .mockRejectedValueOnce(
        new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
      )
      .mockResolvedValueOnce({ data: createAdminDashboard({ totalProjects: 15 }) });

    const user = userEvent.setup();
    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Total projects: 15')).toBeInTheDocument();
    });

    expect(dashboardApi.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('renders zero values correctly when metrics are empty', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard({
        totalProjects: 0,
        tasksByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          IN_REVIEW: 0,
          DONE: 0,
        },
        overdueTaskCount: 0,
        activeUsersOnline: 0,
      }),
    });

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByLabelText('Total projects: 0')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Overdue tasks: 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Active users online: 0')).toBeInTheDocument();
  });
});
