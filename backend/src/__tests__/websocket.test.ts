import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { SOCKET_EVENTS } from '../websocket/types';
import { presenceTracker } from '../websocket/presence.tracker';
import {
  startTestSocketServer,
  connectSocket,
  waitForConnect,
  waitForEvent,
  disconnectSocket,
  signAccessToken,
} from './socket-helpers';
import { login, authHeader, getSeedContext, clearRefreshTokens } from './helpers';

describe('Socket.IO', () => {
  let server: Awaited<ReturnType<typeof startTestSocketServer>>;
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => {
    seed = await getSeedContext();
    presenceTracker.resetForTests();
    server = await startTestSocketServer();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  beforeEach(async () => {
    await clearRefreshTokens();
  });

  describe('Authentication', () => {
    it('rejects unauthenticated socket connections', async () => {
      const socket = ioClient(server.baseUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      await expect(waitForConnect(socket)).rejects.toThrow();
      socket.disconnect();
    });

    it('rejects invalid JWT', async () => {
      const socket = connectSocket(server.baseUrl, 'invalid.jwt.token');
      await expect(waitForConnect(socket)).rejects.toThrow();
      socket.disconnect();
    });

    it('rejects expired JWT', async () => {
      const token = signAccessToken(
        { id: seed.dev1.id, email: seed.dev1.email, role: seed.dev1.role },
        -1,
      );
      const socket = connectSocket(server.baseUrl, token);
      await expect(waitForConnect(socket)).rejects.toThrow();
      socket.disconnect();
    });

    it('rejects inactive user', async () => {
      const inactive = await prisma.user.create({
        data: {
          email: 'inactive-socket@example.com',
          passwordHash: '$2b$12$placeholderhashplaceholderhashpl',
          name: 'Inactive Socket User',
          role: 'DEVELOPER',
          isActive: false,
        },
      });

      const token = signAccessToken({
        id: inactive.id,
        email: inactive.email,
        role: inactive.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await expect(waitForConnect(socket)).rejects.toThrow();

      await prisma.user.delete({ where: { id: inactive.id } });
      socket.disconnect();
    });

    it('accepts valid JWT', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      if (!admin) throw new Error('Admin not found');

      const token = signAccessToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
      await disconnectSocket(socket);
    });
  });

  describe('Project room authorization', () => {
    it('allows Admin to join a project room', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      if (!admin) throw new Error('Admin not found');

      const token = signAccessToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const result = await new Promise<{ success?: boolean; error?: string }>((resolve) => {
        socket.emit(
          SOCKET_EVENTS.PRESENCE_JOIN_PROJECT,
          { projectId: seed.pm1Project.id },
          resolve,
        );
      });

      expect(result.success).toBe(true);
      await disconnectSocket(socket);
    });

    it('allows PM to join own project room', async () => {
      const token = signAccessToken({
        id: seed.pm1.id,
        email: seed.pm1.email,
        role: seed.pm1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const result = await new Promise<{ success?: boolean; error?: string }>((resolve) => {
        socket.emit(
          SOCKET_EVENTS.PRESENCE_JOIN_PROJECT,
          { projectId: seed.pm1Project.id },
          resolve,
        );
      });

      expect(result.success).toBe(true);
      await disconnectSocket(socket);
    });

    it('rejects PM joining another PM project room', async () => {
      const token = signAccessToken({
        id: seed.pm1.id,
        email: seed.pm1.email,
        role: seed.pm1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const result = await new Promise<{ success?: boolean; error?: string }>((resolve) => {
        socket.emit(
          SOCKET_EVENTS.PRESENCE_JOIN_PROJECT,
          { projectId: seed.pm2Project.id },
          resolve,
        );
      });

      expect(result.error).toBe('FORBIDDEN');
      expect(result.success).toBeUndefined();
      await disconnectSocket(socket);
    });

    it('rejects Developer joining project room', async () => {
      const token = signAccessToken({
        id: seed.dev1.id,
        email: seed.dev1.email,
        role: seed.dev1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const result = await new Promise<{ success?: boolean; error?: string }>((resolve) => {
        socket.emit(
          SOCKET_EVENTS.PRESENCE_JOIN_PROJECT,
          { projectId: seed.pm1Project.id },
          resolve,
        );
      });

      expect(result.error).toBe('FORBIDDEN');
      await disconnectSocket(socket);
    });
  });

  describe('Catch-up from PostgreSQL', () => {
    it('sends Admin the latest global activities from DB', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      if (!admin) throw new Error('Admin not found');

      const dbCount = await prisma.activityLog.count();
      const token = signAccessToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const catchup = await waitForEvent<{ events: Array<{ id: string }>; count: number }>(
        socket,
        SOCKET_EVENTS.ACTIVITY_CATCHUP,
      );

      expect(catchup.count).toBeLessThanOrEqual(20);
      expect(catchup.events.length).toBe(Math.min(20, dbCount));
      await disconnectSocket(socket);
    });

    it('sends PM only own-project activities from DB', async () => {
      const pmDbCount = await prisma.activityLog.count({
        where: { project: { createdById: seed.pm1.id } },
      });

      const token = signAccessToken({
        id: seed.pm1.id,
        email: seed.pm1.email,
        role: seed.pm1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const catchup = await waitForEvent<{
        events: Array<{ project: { createdById: string } | null }>;
      }>(socket, SOCKET_EVENTS.ACTIVITY_CATCHUP);

      expect(catchup.events.length).toBe(Math.min(20, pmDbCount));
      for (const event of catchup.events) {
        expect(event.project?.createdById).toBe(seed.pm1.id);
      }
      await disconnectSocket(socket);
    });

    it('sends Developer only assigned-task activities from DB', async () => {
      const devDbCount = await prisma.activityLog.count({
        where: { task: { assigneeId: seed.dev1.id } },
      });

      const token = signAccessToken({
        id: seed.dev1.id,
        email: seed.dev1.email,
        role: seed.dev1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const catchup = await waitForEvent<{
        events: Array<{ task: { assigneeId: string | null } | null }>;
      }>(socket, SOCKET_EVENTS.ACTIVITY_CATCHUP);

      expect(catchup.events.length).toBe(Math.min(20, devDbCount));
      for (const event of catchup.events) {
        expect(event.task?.assigneeId).toBe(seed.dev1.id);
      }
      await disconnectSocket(socket);
    });

    it('includes newly persisted activity after reconnect catch-up', async () => {
      const task = await prisma.task.findFirst({
        where: { assigneeId: seed.dev1.id, projectId: seed.pm1Project.id },
      });
      if (!task) throw new Error('Task not found');

      const { accessToken } = await login(server.app, 'dev1@example.com', 'Dev123!Dev');
      const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' : 'TODO';

      await request(server.app)
        .patch(`/api/tasks/${task.id}`)
        .set(authHeader(accessToken))
        .send({ status: nextStatus })
        .expect(200);

      const latestActivity = await prisma.activityLog.findFirst({
        where: { taskId: task.id, type: 'TASK_STATUS_CHANGED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(latestActivity).toBeTruthy();

      const token = signAccessToken({
        id: seed.dev1.id,
        email: seed.dev1.email,
        role: seed.dev1.role,
      });
      const socket = connectSocket(server.baseUrl, token);
      await waitForConnect(socket);

      const catchup = await waitForEvent<{ events: Array<{ id: string }> }>(
        socket,
        SOCKET_EVENTS.ACTIVITY_CATCHUP,
      );

      expect(catchup.events.some((event) => event.id === latestActivity!.id)).toBe(true);
      await disconnectSocket(socket);

      await prisma.task.update({ where: { id: task.id }, data: { status: task.status } });
    });
  });

  describe('Live activity delivery', () => {
    it('delivers status-change activity only to authorized recipients', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      if (!admin) throw new Error('Admin not found');

      const task = await prisma.task.findFirst({
        where: {
          assigneeId: seed.dev1.id,
          project: { createdById: seed.pm1.id },
        },
      });
      if (!task) throw new Error('Task not found');

      const adminSocket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: admin.id, email: admin.email, role: admin.role }),
      );
      const pm1Socket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: seed.pm1.id, email: seed.pm1.email, role: seed.pm1.role }),
      );
      const pm2Socket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: seed.pm2.id, email: seed.pm2.email, role: seed.pm2.role }),
      );
      const dev1Socket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: seed.dev1.id, email: seed.dev1.email, role: seed.dev1.role }),
      );
      const dev2Socket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: seed.dev2.id, email: seed.dev2.email, role: seed.dev2.role }),
      );

      await Promise.all([
        waitForConnect(adminSocket),
        waitForConnect(pm1Socket),
        waitForConnect(pm2Socket),
        waitForConnect(dev1Socket),
        waitForConnect(dev2Socket),
      ]);

      // Drain initial catch-up events
      await new Promise((resolve) => setTimeout(resolve, 100));

      const adminEvents: string[] = [];
      const pm1Events: string[] = [];
      const pm2Events: string[] = [];
      const dev1Events: string[] = [];
      const dev2Events: string[] = [];

      adminSocket.on(SOCKET_EVENTS.ACTIVITY_EVENT, (payload: { event: { id: string } }) => {
        adminEvents.push(payload.event.id);
      });
      pm1Socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, (payload: { event: { id: string } }) => {
        pm1Events.push(payload.event.id);
      });
      pm2Socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, (payload: { event: { id: string } }) => {
        pm2Events.push(payload.event.id);
      });
      dev1Socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, (payload: { event: { id: string } }) => {
        dev1Events.push(payload.event.id);
      });
      dev2Socket.on(SOCKET_EVENTS.ACTIVITY_EVENT, (payload: { event: { id: string } }) => {
        dev2Events.push(payload.event.id);
      });

      const nextStatus = task.status === 'IN_PROGRESS' ? 'IN_REVIEW' : 'IN_PROGRESS';
      const { accessToken } = await login(server.app, 'dev1@example.com', 'Dev123!Dev');

      await request(server.app)
        .patch(`/api/tasks/${task.id}`)
        .set(authHeader(accessToken))
        .send({ status: nextStatus })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const latestActivity = await prisma.activityLog.findFirst({
        where: { taskId: task.id, type: 'TASK_STATUS_CHANGED', newStatus: nextStatus },
        orderBy: { createdAt: 'desc' },
      });
      expect(latestActivity).toBeTruthy();

      expect(adminEvents).toContain(latestActivity!.id);
      expect(pm1Events).toContain(latestActivity!.id);
      expect(dev1Events).toContain(latestActivity!.id);
      expect(pm2Events).not.toContain(latestActivity!.id);
      expect(dev2Events).not.toContain(latestActivity!.id);

      await Promise.all([
        disconnectSocket(adminSocket),
        disconnectSocket(pm1Socket),
        disconnectSocket(pm2Socket),
        disconnectSocket(dev1Socket),
        disconnectSocket(dev2Socket),
      ]);

      await prisma.task.update({ where: { id: task.id }, data: { status: task.status } });
    });
  });

  describe('Presence', () => {
    it('tracks online users and emits global presence to Admin only', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      if (!admin) throw new Error('Admin not found');

      const adminSocket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: admin.id, email: admin.email, role: admin.role }),
      );
      const initialPresencePromise = waitForEvent<{ onlineCount: number }>(
        adminSocket,
        SOCKET_EVENTS.PRESENCE_GLOBAL,
      );
      await waitForConnect(adminSocket);
      const presence = await initialPresencePromise;
      expect(presence.onlineCount).toBeGreaterThanOrEqual(1);

      let devReceivedPresence = false;
      const devSocket = connectSocket(
        server.baseUrl,
        signAccessToken({ id: seed.dev1.id, email: seed.dev1.email, role: seed.dev1.role }),
      );
      devSocket.on(SOCKET_EVENTS.PRESENCE_GLOBAL, () => {
        devReceivedPresence = true;
      });

      const updatedPresencePromise = waitForEvent<{ onlineCount: number }>(
        adminSocket,
        SOCKET_EVENTS.PRESENCE_GLOBAL,
      );
      await waitForConnect(devSocket);
      expect(devReceivedPresence).toBe(false);

      const updatedPresence = await updatedPresencePromise;
      expect(updatedPresence.onlineCount).toBeGreaterThanOrEqual(2);

      await disconnectSocket(devSocket);
      await disconnectSocket(adminSocket);
    });

    it('keeps user online when one of multiple sockets disconnects', async () => {
      const token = signAccessToken({
        id: seed.pm1.id,
        email: seed.pm1.email,
        role: seed.pm1.role,
      });
      const socket1 = connectSocket(server.baseUrl, token);
      const socket2 = connectSocket(server.baseUrl, token);

      await waitForConnect(socket1);
      await waitForConnect(socket2);
      expect(presenceTracker.isUserOnline(seed.pm1.id)).toBe(true);

      await disconnectSocket(socket1);
      expect(presenceTracker.isUserOnline(seed.pm1.id)).toBe(true);

      await disconnectSocket(socket2);
      expect(presenceTracker.isUserOnline(seed.pm1.id)).toBe(false);
    });
  });

  describe('Notifications', () => {
    it('delivers notification:new and DB-backed notification:count only to the assigned developer', async () => {
      await prisma.notification.deleteMany({ where: { userId: { in: [seed.dev1.id, seed.dev2.id] } } });
      const dev1Socket = connectSocket(server.baseUrl, signAccessToken({ id: seed.dev1.id, email: seed.dev1.email, role: seed.dev1.role }));
      const dev2Socket = connectSocket(server.baseUrl, signAccessToken({ id: seed.dev2.id, email: seed.dev2.email, role: seed.dev2.role }));
      await waitForConnect(dev1Socket);
      await waitForConnect(dev2Socket);
      let unrelatedReceived = false;
      dev2Socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, () => { unrelatedReceived = true; });
      const notificationPromise = waitForEvent<{ notification: { taskId: string; type: string } }>(dev1Socket, SOCKET_EVENTS.NOTIFICATION_NEW);
      const countPromise = waitForEvent<{ unreadCount: number }>(dev1Socket, SOCKET_EVENTS.NOTIFICATION_COUNT);
      const task = await prisma.task.create({ data: { title: 'Notification socket test', projectId: seed.pm1Project.id, createdById: seed.pm1.id } });
      const { accessToken } = await login(server.app, 'pm1@example.com', 'PM123!Dev');
      await request(server.app).patch(`/api/tasks/${task.id}`).set(authHeader(accessToken)).send({ assigneeId: seed.dev1.id }).expect(200);
      expect((await notificationPromise).notification).toMatchObject({ taskId: task.id, type: 'TASK_ASSIGNED' });
      expect((await countPromise).unreadCount).toBe(1);
      expect(unrelatedReceived).toBe(false);
      await disconnectSocket(dev1Socket);
      await disconnectSocket(dev2Socket);
      await prisma.task.delete({ where: { id: task.id } });
    });
  });

  describe('CORS', () => {
    it('uses configured origin with credentials, not wildcard', async () => {
      expect(env.corsOrigin).not.toBe('*');

      const response = await request(server.app)
        .options('/api/auth/login')
        .set('Origin', env.corsOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(env.corsOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
