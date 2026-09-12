import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { clientsApi } from '../api/clients.api';
import { dashboardApi } from '../api/dashboard.api';
import { projectsApi } from '../api/projects.api';
import { renderApp } from '../test/renderApp';
import {
  createClient,
  createClientListResponse,
  createDeveloperDashboard,
  createProject,
  createProjectListResponse,
  createSession,
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

vi.mock('../api/clients.api', () => ({
  clientsApi: {
    list: vi.fn(),
  },
}));

describe('Project management UI', () => {
  beforeEach(() => {
    vi.mocked(projectsApi.list).mockResolvedValue(createProjectListResponse());
    vi.mocked(projectsApi.getById).mockResolvedValue({ data: createProject() });
    vi.mocked(projectsApi.create).mockResolvedValue({
      data: createProject({ id: 'project-created', name: 'New Portal' }),
    });
    vi.mocked(clientsApi.list).mockResolvedValue(createClientListResponse());
  });

  it('allows admin to access and render project management', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    renderApp({ initialRoute: '/admin/projects' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Client Portal Redesign')).toBeInTheDocument();
    });

    expect(projectsApi.list).toHaveBeenCalled();
  });

  it('allows PM to access and render project management', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    renderApp({ initialRoute: '/manager/projects' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    });

    expect(screen.getByText('Projects you created and manage.')).toBeInTheDocument();
  });

  it('denies developer access to admin project management routes', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));

    renderApp({ initialRoute: '/admin/projects' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(projectsApi.list).not.toHaveBeenCalled();
  });

  it('does not show project navigation to developers', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      data: createDeveloperDashboard(),
    });

    renderApp({ initialRoute: '/developer' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Assigned Tasks' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('shows project list loading skeleton while projects are pending', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    let resolveList: ((value: ReturnType<typeof createProjectListResponse>) => void) | undefined;
    vi.mocked(projectsApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    renderApp({ initialRoute: '/admin/projects' });

    await waitFor(() => {
      expect(document.querySelector('.project-list-skeleton')).toBeInTheDocument();
    });

    resolveList?.(createProjectListResponse());

    await waitFor(() => {
      expect(screen.getByText('Client Portal Redesign')).toBeInTheDocument();
    });
  });

  it('shows project list error state', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.list).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Projects unavailable' }),
    );

    renderApp({ initialRoute: '/admin/projects' });

    await waitFor(() => {
      expect(screen.getByText('Projects unavailable')).toBeInTheDocument();
    });
  });

  it('shows empty project list state', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.list).mockResolvedValue(createProjectListResponse([]));

    renderApp({ initialRoute: '/admin/projects' });

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });
  });

  it('validates required fields on project creation form', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading clients…')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    expect(screen.getByText('Client is required')).toBeInTheDocument();
    expect(projectsApi.create).not.toHaveBeenCalled();
  });

  it('creates a project and navigates to the new project detail page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.getById).mockResolvedValue({
      data: createProject({ id: 'project-created', name: 'New Portal' }),
    });
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading clients…')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Project name'), 'New Portal');
    await user.selectOptions(screen.getByLabelText('Client'), 'client-1');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(vi.mocked(projectsApi.create).mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          name: 'New Portal',
          clientId: 'client-1',
          status: 'PLANNED',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New Portal' })).toBeInTheDocument();
    });
  });

  it('loads clients for project creation selection', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));
    vi.mocked(clientsApi.list).mockResolvedValue(
      createClientListResponse([
        createClient({ id: 'client-a', name: 'Alpha Client' }),
        createClient({ id: 'client-b', name: 'Beta Client', company: 'Beta Co' }),
      ]),
    );

    renderApp({ initialRoute: '/manager/projects/new' });

    await waitFor(() => {
      expect(clientsApi.list).toHaveBeenCalled();
    });

    const clientSelect = screen.getByLabelText('Client') as HTMLSelectElement;
    const options = within(clientSelect).getAllByRole('option');
    expect(options.some((option) => option.textContent?.includes('Alpha Client'))).toBe(true);
    expect(options.some((option) => option.textContent?.includes('Beta Client'))).toBe(true);
  });

  it('shows empty client state on create project page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(clientsApi.list).mockResolvedValue(createClientListResponse([]));

    renderApp({ initialRoute: '/admin/projects/new' });

    await waitFor(() => {
      expect(screen.getByText('No clients available')).toBeInTheDocument();
    });
  });

  it('surfaces API errors from project creation', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.create).mockRejectedValue(
      new ApiRequestError(404, { code: 'NOT_FOUND', message: 'Client not found' }),
    );
    const user = userEvent.setup();

    renderApp({ initialRoute: '/admin/projects/new' });

    await waitFor(() => {
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Project name'), 'Broken Project');
    await user.selectOptions(screen.getByLabelText('Client'), 'client-1');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(screen.getByText('Client not found')).toBeInTheDocument();
    });
  });

  it('renders project detail from the API response', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(projectsApi.getById).mockResolvedValue({
      data: createProject({
        id: 'project-detail-1',
        name: 'Analytics Rollout',
        description: 'Deploy analytics tooling.',
        client: createClient({ name: 'Globex Industries', company: 'Globex' }),
      }),
    });

    renderApp({ initialRoute: '/admin/projects/project-detail-1' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Analytics Rollout' })).toBeInTheDocument();
    });

    expect(screen.getByText('Deploy analytics tooling.')).toBeInTheDocument();
    expect(screen.getByText('Globex Industries')).toBeInTheDocument();
  });
});
