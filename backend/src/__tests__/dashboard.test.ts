import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { authHeader, clearRefreshTokens, getSeedContext, login } from './helpers';
import { presenceTracker } from '../websocket/presence.tracker';
import { getCurrentWeekRange } from '../utils/week-range';

const app = createApp();

describe('GET /api/dashboard', () => {
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => {
    seed = await getSeedContext();
  });

  beforeEach(async () => {
    await clearRefreshTokens();
    presenceTracker.resetForTests();
  });

  it('returns 401 for unauthenticated requests', async () => {
    const response = await request(app).get('/api/dashboard').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  describe('ADMIN dashboard', () => {
    it('returns global project, task, overdue, and presence counts', async () => {
      presenceTracker.addConnection('admin-socket-1', seed.pm1.id);
      presenceTracker.addConnection('admin-socket-2', seed.dev1.id);

      const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

      const [totalProjects, tasksByStatusGroups, overdueTaskCount] = await Promise.all([
        prisma.project.count(),
        prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.task.count({ where: { isOverdue: true } }),
      ]);

      const expectedTasksByStatus = {
        TODO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 0,
      };

      for (const group of tasksByStatusGroups) {
        expectedTasksByStatus[group.status] = group._count._all;
      }

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data).toEqual({
        totalProjects,
        tasksByStatus: expectedTasksByStatus,
        overdueTaskCount,
        activeUsersOnline: 2,
      });
    });

    it('returns zero activeUsersOnline when no users are connected', async () => {
      const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data.activeUsersOnline).toBe(0);
    });

    it('does not accept a role query parameter to change the dashboard shape', async () => {
      const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

      const response = await request(app)
        .get('/api/dashboard?role=DEVELOPER')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data).toHaveProperty('totalProjects');
      expect(response.body.data).not.toHaveProperty('assignedTasks');
    });
  });

  describe('PROJECT_MANAGER dashboard', () => {
    it('scopes project and task counts to the authenticated PM only', async () => {
      const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

      const [projectCount, priorityGroups] = await Promise.all([
        prisma.project.count({ where: { createdById: seed.pm1.id } }),
        prisma.task.groupBy({
          by: ['priority'],
          where: { project: { createdById: seed.pm1.id } },
          _count: { _all: true },
        }),
      ]);

      const expectedTasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      for (const group of priorityGroups) {
        expectedTasksByPriority[group.priority] = group._count._all;
      }

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data.projectCount).toBe(projectCount);
      expect(response.body.data.tasksByPriority).toEqual(expectedTasksByPriority);
      expect(response.body.data).not.toHaveProperty('totalProjects');
    });

    it('excludes another PM projects from counts and upcoming tasks', async () => {
      const { accessToken: pm1Token } = await login(app, 'pm1@example.com', 'PM123!Dev');
      const { accessToken: pm2Token } = await login(app, 'pm2@example.com', 'PM456!Dev');

      const pm2ProjectCount = await prisma.project.count({ where: { createdById: seed.pm2.id } });
      expect(pm2ProjectCount).toBeGreaterThan(0);

      const pm1Response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(pm1Token))
        .expect(200);

      const pm2Response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(pm2Token))
        .expect(200);

      expect(pm1Response.body.data.projectCount).not.toBe(pm2Response.body.data.projectCount);

      const { start, end } = getCurrentWeekRange();
      const pm2Upcoming = await prisma.task.findMany({
        where: {
          project: { createdById: seed.pm2.id },
          dueDate: { gte: start, lte: end },
          status: { not: 'DONE' },
        },
        select: { id: true },
      });

      const pm1UpcomingIds = pm1Response.body.data.upcomingDueThisWeek.map(
        (task: { id: string }) => task.id,
      );

      for (const task of pm2Upcoming) {
        expect(pm1UpcomingIds).not.toContain(task.id);
      }
    });

    it('does not expand access through query parameters', async () => {
      const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

      const baseline = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      const manipulated = await request(app)
        .get(`/api/dashboard?createdById=${seed.pm2.id}`)
        .set(authHeader(accessToken))
        .expect(200);

      expect(manipulated.body.data.projectCount).toBe(baseline.body.data.projectCount);
    });

    it('returns an empty upcoming list when no PM tasks are due this week', async () => {
      const { start, end } = getCurrentWeekRange();
      const tasksInWeek = await prisma.task.findMany({
        where: {
          project: { createdById: seed.pm1.id },
          dueDate: { gte: start, lte: end },
        },
        select: { id: true, dueDate: true },
      });

      const originalDueDates = new Map(
        tasksInWeek.map((task) => [task.id, task.dueDate] as const),
      );

      if (tasksInWeek.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: tasksInWeek.map((task) => task.id) } },
          data: { dueDate: null },
        });
      }

      const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data.upcomingDueThisWeek).toEqual([]);

      for (const [id, dueDate] of originalDueDates) {
        await prisma.task.update({
          where: { id },
          data: { dueDate },
        });
      }
    });
  });

  describe('DEVELOPER dashboard', () => {
    it('returns only assigned tasks for the authenticated developer', async () => {
      const { accessToken: dev1Token } = await login(app, 'dev1@example.com', 'Dev123!Dev');
      const { accessToken: dev2Token } = await login(app, 'dev2@example.com', 'Dev456!Dev');

      const dev1Response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(dev1Token))
        .expect(200);

      const dev2Response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(dev2Token))
        .expect(200);

      const dev1TaskIds = dev1Response.body.data.assignedTasks.map((task: { id: string }) => task.id);
      const dev2TaskIds = dev2Response.body.data.assignedTasks.map((task: { id: string }) => task.id);

      expect(dev1TaskIds.length).toBeGreaterThan(0);
      expect(dev2TaskIds.length).toBeGreaterThan(0);
      expect(dev1TaskIds).not.toEqual(dev2TaskIds);

      for (const taskId of dev1TaskIds) {
        expect(dev2TaskIds).not.toContain(taskId);
      }
    });

    it('orders assigned tasks by priority desc then due date asc', async () => {
      const taskLow = await prisma.task.create({
        data: {
          title: 'Dashboard order low',
          priority: 'LOW',
          dueDate: new Date('2026-09-20T00:00:00.000Z'),
          projectId: seed.pm1Project.id,
          assigneeId: seed.dev1.id,
          createdById: seed.pm1.id,
        },
      });
      const taskMedium = await prisma.task.create({
        data: {
          title: 'Dashboard order medium',
          priority: 'MEDIUM',
          dueDate: new Date('2026-09-12T00:00:00.000Z'),
          projectId: seed.pm1Project.id,
          assigneeId: seed.dev1.id,
          createdById: seed.pm1.id,
        },
      });
      const taskHighLater = await prisma.task.create({
        data: {
          title: 'Dashboard order high later',
          priority: 'HIGH',
          dueDate: new Date('2026-09-25T00:00:00.000Z'),
          projectId: seed.pm1Project.id,
          assigneeId: seed.dev1.id,
          createdById: seed.pm1.id,
        },
      });
      const taskHighSoon = await prisma.task.create({
        data: {
          title: 'Dashboard order high soon',
          priority: 'HIGH',
          dueDate: new Date('2026-09-10T00:00:00.000Z'),
          projectId: seed.pm1Project.id,
          assigneeId: seed.dev1.id,
          createdById: seed.pm1.id,
        },
      });
      const taskCritical = await prisma.task.create({
        data: {
          title: 'Dashboard order critical',
          priority: 'CRITICAL',
          dueDate: new Date('2026-09-30T00:00:00.000Z'),
          projectId: seed.pm1Project.id,
          assigneeId: seed.dev1.id,
          createdById: seed.pm1.id,
        },
      });

      const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      const orderedIds = response.body.data.assignedTasks.map((task: { id: string }) => task.id);
      const criticalIndex = orderedIds.indexOf(taskCritical.id);
      const highSoonIndex = orderedIds.indexOf(taskHighSoon.id);
      const highLaterIndex = orderedIds.indexOf(taskHighLater.id);
      const mediumIndex = orderedIds.indexOf(taskMedium.id);
      const lowIndex = orderedIds.indexOf(taskLow.id);

      expect(criticalIndex).toBeGreaterThan(-1);
      expect(highSoonIndex).toBeGreaterThan(criticalIndex);
      expect(highLaterIndex).toBeGreaterThan(highSoonIndex);
      expect(mediumIndex).toBeGreaterThan(highLaterIndex);
      expect(lowIndex).toBeGreaterThan(mediumIndex);

      await prisma.task.deleteMany({
        where: {
          id: { in: [taskLow.id, taskMedium.id, taskHighLater.id, taskHighSoon.id, taskCritical.id] },
        },
      });
    });

    it('returns an empty assignedTasks array when the developer has no assignments', async () => {
      const dev1Record = await prisma.user.findUnique({ where: { email: 'dev1@example.com' } });
      if (!dev1Record) throw new Error('dev1 not found');

      const developer = await prisma.user.create({
        data: {
          email: `dev-empty-${Date.now()}@example.com`,
          passwordHash: dev1Record.passwordHash,
          name: 'Empty Developer',
          role: 'DEVELOPER',
        },
      });

      const { accessToken } = await login(app, developer.email, 'Dev123!Dev');

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data.assignedTasks).toEqual([]);

      await prisma.user.delete({ where: { id: developer.id } });
    });
  });

  describe('Edge cases', () => {
    it('returns numeric zero counts when overdue tasks are absent for admin', async () => {
      const overdueTasks = await prisma.task.findMany({
        where: { isOverdue: true },
        select: { id: true, dueDate: true, status: true },
      });

      await prisma.task.updateMany({
        where: { isOverdue: true },
        data: { isOverdue: false, overdueAt: null },
      });

      const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body.data.overdueTaskCount).toBe(0);

      for (const task of overdueTasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: { isOverdue: true },
        });
      }
    });
  });
});
