import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activityApi } from '../api/activity.api';
import { authApi } from '../api/auth.api';
import { notificationsApi } from '../api/notifications.api';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { useGlobalRealtime } from '../hooks/useGlobalRealtime';
import { createActivityEvent, createActivityListResponse, createSession } from '../test/fixtures';
import { SOCKET_EVENTS } from '../websocket/socketEvents';
import { io } from 'socket.io-client';

vi.mock('../api/auth.api', () => ({
  authApi: {
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('../api/activity.api', () => ({
  activityApi: {
    list: vi.fn(),
  },
}));

vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

type HandlerMap = Record<string, Array<(payload: unknown) => void>>;

function createMockSocket() {
  const handlers: HandlerMap = {};
  const socket = {
    connected: true,
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(handler);
      if (event === 'connect') {
        handler(undefined);
      }
    }),
    off: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((item) => item !== handler);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, payload?: unknown) {
      for (const handler of handlers[event] ?? []) {
        handler(payload);
      }
    },
  };

  return socket;
}

function RealtimeHarness() {
  useGlobalRealtime();
  return (
    <>
      <ActivityFeed />
      <NotificationBell />
    </>
  );
}

function renderRealtimeHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <MemoryRouter>
            <RealtimeHarness />
          </MemoryRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function waitForRealtimeReady(mockSocket: ReturnType<typeof createMockSocket>) {
  return waitFor(() => {
    expect(mockSocket.on).toHaveBeenCalledWith(
      SOCKET_EVENTS.ACTIVITY_EVENT,
      expect.any(Function),
    );
  });
}

describe('realtime integration', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.mocked(io).mockReturnValue(mockSocket as never);
    vi.mocked(authApi.refresh).mockResolvedValue(createSession('ADMIN'));
    vi.mocked(activityApi.list).mockResolvedValue(createActivityListResponse([]));
    vi.mocked(notificationsApi.list).mockResolvedValue({ data: [] });
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue({ data: { unreadCount: 0 } });
  });

  it('loads initial activity from REST and renders human-readable messages', async () => {
    vi.mocked(activityApi.list).mockResolvedValue(
      createActivityListResponse([createActivityEvent()]),
    );

    renderRealtimeHarness();

    await waitFor(() => {
      expect(
        screen.getByText('Ravi moved Design homepage from In progress → In review'),
      ).toBeInTheDocument();
    });
  });

  it('merges live activity:event updates without duplicates', async () => {
    vi.mocked(activityApi.list).mockResolvedValue(
      createActivityListResponse([createActivityEvent({ id: 'activity-1' })]),
    );

    renderRealtimeHarness();

    await waitFor(() => {
      expect(screen.getByLabelText('Activity feed')).toBeInTheDocument();
    });

    await waitForRealtimeReady(mockSocket);

    mockSocket.trigger(SOCKET_EVENTS.ACTIVITY_EVENT, {
      event: createActivityEvent({ id: 'activity-2', task: { id: 'task-2', title: 'API docs', assigneeId: null } }),
    });
    mockSocket.trigger(SOCKET_EVENTS.ACTIVITY_EVENT, {
      event: createActivityEvent({ id: 'activity-2', task: { id: 'task-2', title: 'API docs', assigneeId: null } }),
    });

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  it('merges reconnect catch-up events chronologically', async () => {
    vi.mocked(activityApi.list).mockResolvedValue(createActivityListResponse([]));

    renderRealtimeHarness();

    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });

    await waitForRealtimeReady(mockSocket);

    mockSocket.trigger(SOCKET_EVENTS.ACTIVITY_CATCHUP, {
      events: [
        createActivityEvent({ id: 'activity-old', createdAt: '2026-09-01T10:00:00.000Z' }),
        createActivityEvent({ id: 'activity-new', createdAt: '2026-09-02T10:00:00.000Z' }),
      ],
      count: 2,
      serverTimestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  it('updates notification unread count from notification:count socket event', async () => {
    renderRealtimeHarness();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    await waitForRealtimeReady(mockSocket);

    mockSocket.trigger(SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: 3 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    });
  });

  it('shows notification list and marks one notification read', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({
      data: [
        {
          id: 'notification-1',
          type: 'TASK_STATUS_CHANGED',
          title: 'Task updated',
          message: 'Status changed',
          projectId: 'project-1',
          taskId: 'task-1',
          isRead: false,
          readAt: null,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue({ data: { unreadCount: 1 } });

    const user = userEvent.setup();
    renderRealtimeHarness();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));

    expect(await screen.findByText('Task updated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark read' }));

    expect(notificationsApi.markRead).toHaveBeenCalledWith('notification-1');
  });
});
