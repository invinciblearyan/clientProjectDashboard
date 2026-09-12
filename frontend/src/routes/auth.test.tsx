import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { dashboardApi } from '../api/dashboard.api';
import { getAccessToken, setAccessToken } from '../api/client';
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

describe('Authentication session behavior', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.mocked(authApi.refresh).mockRejectedValue(
      new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'Refresh token is required' }),
    );
    vi.mocked(authApi.login).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(authApi.logout).mockResolvedValue({ message: 'Logged out successfully' });
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createAdminDashboard(),
    });
  });

  it('bootstraps an authenticated session from refresh on startup', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createManagerDashboard(),
    });

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    expect(getAccessToken()).toBe('access-token-PROJECT_MANAGER');
  });

  it('logs in successfully and stores the access token in memory', async () => {
    const user = userEvent.setup();

    renderApp({ initialRoute: '/login' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'Admin123!Dev');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'Admin123!Dev',
    });
    expect(getAccessToken()).toBe('access-token-ADMIN');
  });

  it('clears the session and returns to login after logout', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard(),
    });
    const user = userEvent.setup();

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Assigned Tasks' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('redirects unauthenticated users from / to /login', async () => {
    renderApp({ initialRoute: '/' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    });
  });
});
