import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { renderApp } from '../test/renderApp';
import { createManagerDashboard, createSession } from '../test/fixtures';
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

describe('Manager dashboard', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard(),
    });
  });

  it('renders successfully for project manager users', async () => {
    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Your projects: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Task counts by priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Upcoming tasks due this week')).toBeInTheDocument();
  });

  it('displays project count correctly', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard({ projectCount: 7 }),
    });

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByLabelText('Your projects: 7')).toBeInTheDocument();
    });
  });

  it('displays all four priority labels', async () => {
    renderApp({ initialRoute: '/manager' });

    const priorityList = await screen.findByLabelText('Task counts by priority');
    const items = within(priorityList).getAllByRole('listitem');

    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('Critical')).toBeInTheDocument();
    expect(within(items[1]).getByText('High')).toBeInTheDocument();
    expect(within(items[2]).getByText('Medium')).toBeInTheDocument();
    expect(within(items[3]).getByText('Low')).toBeInTheDocument();
  });

  it('displays correct priority counts', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard({
        tasksByPriority: {
          CRITICAL: 1,
          HIGH: 2,
          MEDIUM: 3,
          LOW: 4,
        },
      }),
    });

    renderApp({ initialRoute: '/manager' });

    const priorityList = await screen.findByLabelText('Task counts by priority');
    const items = within(priorityList).getAllByRole('listitem');

    expect(within(items[0]).getByText('1')).toBeInTheDocument();
    expect(within(items[1]).getByText('2')).toBeInTheDocument();
    expect(within(items[2]).getByText('3')).toBeInTheDocument();
    expect(within(items[3]).getByText('4')).toBeInTheDocument();
  });

  it('renders upcoming tasks', async () => {
    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });

    expect(screen.getByText('Security review checklist')).toBeInTheDocument();
  });

  it('renders project names for upcoming tasks', async () => {
    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByText('Client Portal Redesign')).toBeInTheDocument();
    });

    expect(screen.getByText('Mobile App MVP')).toBeInTheDocument();
  });

  it('renders priority, status, and due date for upcoming tasks', async () => {
    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    });

    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getByText(/In progress \(IN PROGRESS\)/)).toBeInTheDocument();
    expect(screen.getByText(/To do \(TODO\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Due /).length).toBeGreaterThan(0);
  });

  it('renders an empty state when there are no upcoming tasks this week', async () => {
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard({ upcomingDueThisWeek: [] }),
    });

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByText('No upcoming tasks this week')).toBeInTheDocument();
    });
  });

  it('shows a loading skeleton while the dashboard request is pending', async () => {
    let resolveDashboard:
      | ((value: { data: ReturnType<typeof createManagerDashboard> }) => void)
      | undefined;

    vi.mocked(dashboardApi.getDashboard).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDashboard = resolve;
        }),
    );

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(document.querySelector('.manager-dashboard-skeleton')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Your projects: 4')).not.toBeInTheDocument();

    resolveDashboard?.({ data: createManagerDashboard() });

    await waitFor(() => {
      expect(screen.getByLabelText('Your projects: 4')).toBeInTheDocument();
    });
  });

  it('shows an error state when the API fails', async () => {
    vi.mocked(dashboardApi.getDashboard).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
    );

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your projects: 0')).not.toBeInTheDocument();
  });

  it('retries loading the dashboard when Try again is clicked', async () => {
    vi.mocked(dashboardApi.getDashboard)
      .mockRejectedValueOnce(
        new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable' }),
      )
      .mockResolvedValueOnce({ data: createManagerDashboard({ projectCount: 9 }) });

    const user = userEvent.setup();
    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Your projects: 9')).toBeInTheDocument();
    });

    expect(dashboardApi.getDashboard).toHaveBeenCalledTimes(2);
  });
});
