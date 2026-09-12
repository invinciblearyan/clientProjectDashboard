import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { renderApp } from '../test/renderApp';
import { createAdminDashboard, createDeveloperDashboard, createManagerDashboard, createSession } from '../test/fixtures';
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

describe('Protected routing', () => {
  beforeEach(() => {
    vi.mocked(authApi.refresh).mockRejectedValue(
      new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'Refresh token is required' }),
    );
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard(),
    });
  });

  it('directs unauthenticated users to /login from protected routes', async () => {
    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    });
  });

  it('allows authenticated ADMIN users to access /admin', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('allows authenticated PROJECT_MANAGER users to access /manager', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard(),
    });

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('allows authenticated DEVELOPER users to access /developer', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard(),
    });

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Assigned Tasks' })).toBeInTheDocument();
    });
  });

  it('directs authenticated users with the wrong role to /unauthorized', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });
  });
});
