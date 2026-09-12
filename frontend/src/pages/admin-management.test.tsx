import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../api/auth.api';
import { clientsApi } from '../api/clients.api';
import { usersApi } from '../api/users.api';
import { renderApp } from '../test/renderApp';
import {
  createClient,
  createClientListResponse,
  createSession,
  createUser,
  createUserListResponse,
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

vi.mock('../api/users.api', () => ({
  usersApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('../api/clients.api', () => ({
  clientsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Admin user management UI', () => {
  beforeEach(() => {
    vi.mocked(usersApi.list).mockResolvedValue(
      createUserListResponse([
        createUser('ADMIN', { id: 'admin-id', name: 'Admin User', email: 'admin@example.com' }),
        createUser('PROJECT_MANAGER', {
          id: 'pm-id',
          name: 'PM One',
          email: 'pm1@example.com',
        }),
        createUser('DEVELOPER', {
          id: 'dev-id',
          name: 'Dev One',
          email: 'dev1@example.com',
        }),
      ]),
    );
    vi.mocked(usersApi.create).mockResolvedValue({
      data: createUser('DEVELOPER', {
        id: 'new-dev-id',
        name: 'New Dev',
        email: 'newdev@example.com',
      }),
    });
    vi.mocked(usersApi.update).mockResolvedValue({
      data: createUser('DEVELOPER', {
        id: 'dev-id',
        name: 'Dev Updated',
        email: 'dev1@example.com',
      }),
    });
    vi.mocked(usersApi.deactivate).mockResolvedValue({
      data: createUser('DEVELOPER', {
        id: 'dev-id',
        name: 'Dev One',
        email: 'dev1@example.com',
        isActive: false,
      }),
    });
  });

  it('allows admin to access and render the users page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(usersApi.list).toHaveBeenCalled();
  });

  it('denies PM access to the users route', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(usersApi.list).not.toHaveBeenCalled();
  });

  it('denies developer access to the users route', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(usersApi.list).not.toHaveBeenCalled();
  });

  it('shows only admin navigation links for users and clients management', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manager Home' })).not.toBeInTheDocument();
  });

  it('does not show users or clients links to PM users', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));

    renderApp({ initialRoute: '/manager' });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Manager Home' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Clients' })).not.toBeInTheDocument();
  });

  it('shows loading state while users are pending', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    let resolveList: ((value: ReturnType<typeof createUserListResponse>) => void) | undefined;
    vi.mocked(usersApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByText('Loading users…')).toBeInTheDocument();
    });

    resolveList?.(createUserListResponse());
    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Users' })).toBeInTheDocument();
    });
  });

  it('shows error state when user list fails', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(usersApi.list).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Unable to load users' }),
    );

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load users' })).toBeInTheDocument();
    });
  });

  it('shows empty state when no users exist', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(usersApi.list).mockResolvedValue(createUserListResponse([]));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByText('No users yet')).toBeInTheDocument();
    });
  });

  it('creates a user and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    await user.type(screen.getByLabelText('Email'), 'newdev@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.type(screen.getByLabelText('Name'), 'New Dev');
    await user.selectOptions(screen.getByLabelText('Role'), 'DEVELOPER');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(usersApi.create).toHaveBeenCalledWith({
        email: 'newdev@example.com',
        password: 'Password123',
        name: 'New Dev',
        role: 'DEVELOPER',
      });
    });

    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('User created successfully.')).toBeInTheDocument();
  });

  it('updates a user and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByText('Dev One')).toBeInTheDocument();
    });

    const row = screen.getByText('Dev One').closest('tr');
    expect(row).toBeTruthy();
    await user.click(within(row!).getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Dev Updated');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(usersApi.update).toHaveBeenCalledWith('dev-id', {
        name: 'Dev Updated',
        role: 'DEVELOPER',
        isActive: true,
      });
    });

    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('deactivates a user and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByText('Dev One')).toBeInTheDocument();
    });

    const row = screen.getByText('Dev One').closest('tr');
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(usersApi.deactivate).toHaveBeenCalledWith('dev-id');
    });

    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('Dev One was deactivated.')).toBeInTheDocument();
  });

  it('renders server validation errors on create', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(usersApi.create).mockRejectedValue(
      new ApiRequestError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'email', message: 'Invalid email' }],
      }),
    );

    renderApp({ initialRoute: '/admin/users' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    await user.type(screen.getByLabelText('Email'), 'bad-email');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.type(screen.getByLabelText('Name'), 'Bad Email User');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(screen.getByText('Request validation failed')).toBeInTheDocument();
    });
  });
});

describe('Admin client management UI', () => {
  beforeEach(() => {
    vi.mocked(clientsApi.list).mockResolvedValue(
      createClientListResponse([
        createClient({ id: 'client-1', name: 'Acme Corporation' }),
        createClient({ id: 'client-2', name: 'Globex Industries', company: 'Globex' }),
      ]),
    );
    vi.mocked(clientsApi.create).mockResolvedValue({
      data: createClient({ id: 'client-new', name: 'New Client Co' }),
    });
    vi.mocked(clientsApi.update).mockResolvedValue({
      data: createClient({ id: 'client-2', name: 'Globex Updated', company: 'Globex' }),
    });
    vi.mocked(clientsApi.delete).mockResolvedValue(undefined);
  });

  it('allows admin to access and render the clients page', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    });

    expect(clientsApi.list).toHaveBeenCalled();
  });

  it('denies PM access to the clients route', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('PROJECT_MANAGER'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(clientsApi.list).not.toHaveBeenCalled();
  });

  it('denies developer access to the clients route', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('DEVELOPER'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    });

    expect(clientsApi.list).not.toHaveBeenCalled();
  });

  it('shows loading state while clients are pending', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    let resolveList: ((value: ReturnType<typeof createClientListResponse>) => void) | undefined;
    vi.mocked(clientsApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByText('Loading clients…')).toBeInTheDocument();
    });

    resolveList?.(createClientListResponse());
    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Clients' })).toBeInTheDocument();
    });
  });

  it('shows error state when client list fails', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(clientsApi.list).mockRejectedValue(
      new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'Unable to load clients' }),
    );

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load clients' })).toBeInTheDocument();
    });
  });

  it('shows empty state when no clients exist', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(clientsApi.list).mockResolvedValue(createClientListResponse([]));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByText('No clients yet')).toBeInTheDocument();
    });
  });

  it('creates a client and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add client' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add client' }));
    await user.type(screen.getByLabelText('Client name'), 'New Client Co');
    await user.type(screen.getByLabelText('Company'), 'New Co');
    await user.type(screen.getByLabelText('Contact email'), 'contact@newclient.example.com');
    await user.click(screen.getByRole('button', { name: 'Create client' }));

    await waitFor(() => {
      expect(clientsApi.create).toHaveBeenCalledWith({
        name: 'New Client Co',
        company: 'New Co',
        contactEmail: 'contact@newclient.example.com',
      });
    });

    await waitFor(() => {
      expect(clientsApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('updates a client and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByText('Globex Industries')).toBeInTheDocument();
    });

    const row = screen.getByText('Globex Industries').closest('tr');
    await user.click(within(row!).getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Client name'));
    await user.type(screen.getByLabelText('Client name'), 'Globex Updated');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(clientsApi.update).toHaveBeenCalledWith('client-2', {
        name: 'Globex Updated',
        company: 'Globex',
        contactEmail: 'contact@acme.example.com',
      });
    });

    await waitFor(() => {
      expect(clientsApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes a client and refetches the list', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByText('Globex Industries')).toBeInTheDocument();
    });

    const row = screen.getByText('Globex Industries').closest('tr');
    await user.click(within(row!).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(clientsApi.delete).toHaveBeenCalledWith('client-2');
    });

    await waitFor(() => {
      expect(clientsApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('renders structured delete errors cleanly', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(clientsApi.delete).mockRejectedValue(
      new ApiRequestError(409, {
        code: 'CONFLICT',
        message: 'Cannot delete a client with linked projects',
      }),
    );

    renderApp({ initialRoute: '/admin/clients' });

    await waitFor(() => {
      expect(screen.getByText('Globex Industries')).toBeInTheDocument();
    });

    const row = screen.getByText('Globex Industries').closest('tr');
    await user.click(within(row!).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete a client with linked projects')).toBeInTheDocument();
    });
  });
});
