import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { processOverdueTasks } from '../jobs/overdue-tasks.job';
import { authHeader, getSeedContext, login } from './helpers';

const app = createApp();

describe('Notifications and overdue processing', () => {
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => { seed = await getSeedContext(); });

  it('creates an assignment notification and exposes it only to its recipient', async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [seed.dev1.id, seed.dev2.id] } } });
    const { accessToken: pmToken } = await login(app, 'pm1@example.com', 'PM123!Dev');
    const task = await prisma.task.create({ data: { title: 'Assignment notification test', projectId: seed.pm1Project.id, createdById: seed.pm1.id } });
    await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(pmToken)).send({ assigneeId: seed.dev1.id }).expect(200);
    await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(pmToken)).send({ assigneeId: seed.dev1.id }).expect(200);
    expect(await prisma.notification.count({ where: { userId: seed.dev1.id, taskId: task.id, type: 'TASK_ASSIGNED' } })).toBe(1);

    const { accessToken: dev1Token } = await login(app, 'dev1@example.com', 'Dev123!Dev');
    const { accessToken: dev2Token } = await login(app, 'dev2@example.com', 'Dev456!Dev');
    const own = await request(app).get('/api/notifications').set(authHeader(dev1Token)).expect(200);
    const created = own.body.data.find((item: { taskId: string }) => item.taskId === task.id);
    expect(created).toMatchObject({ type: 'TASK_ASSIGNED', taskId: task.id, isRead: false });
    const other = await request(app).get('/api/notifications').set(authHeader(dev2Token)).expect(200);
    expect(other.body.data.some((item: { id: string }) => item.id === created.id)).toBe(false);
    await prisma.task.delete({ where: { id: task.id } });
  });

  it('enforces notification ownership for read and read-all operations', async () => {
    const own = await prisma.notification.create({ data: { userId: seed.dev1.id, type: 'TASK_ASSIGNED', title: 'Own', message: 'Own test notification' } });
    const foreign = await prisma.notification.create({ data: { userId: seed.dev2.id, type: 'TASK_ASSIGNED', title: 'Foreign', message: 'Foreign test notification' } });
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');
    await request(app).patch(`/api/notifications/${own.id}/read`).set(authHeader(accessToken)).expect(204);
    await request(app).patch(`/api/notifications/${foreign.id}/read`).set(authHeader(accessToken)).expect(404);
    await request(app).patch('/api/notifications/read-all').set(authHeader(accessToken)).expect(204);
    expect(await prisma.notification.findUnique({ where: { id: own.id } })).toMatchObject({ isRead: true });
    expect(await prisma.notification.findUnique({ where: { id: foreign.id } })).toMatchObject({ isRead: false });
  });

  it('notifies only the owning PM when a task transitions into IN_REVIEW', async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [seed.pm1.id, seed.pm2.id] } } });
    const task = await prisma.task.create({ data: { title: 'Review notification test', projectId: seed.pm1Project.id, createdById: seed.pm1.id, status: 'TODO' } });
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');
    await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(accessToken)).send({ status: 'IN_REVIEW' }).expect(200);
    await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(accessToken)).send({ status: 'IN_REVIEW' }).expect(200);
    expect(await prisma.notification.count({ where: { userId: seed.pm1.id, taskId: task.id, type: 'TASK_IN_REVIEW' } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: seed.pm2.id, taskId: task.id } })).toBe(0);
    await prisma.task.delete({ where: { id: task.id } });
  });

  it('persists each overdue transition once and skips done/future tasks', async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    const [eligible, done, futureTask] = await Promise.all([
      prisma.task.create({ data: { title: 'Overdue eligible test', projectId: seed.pm1Project.id, createdById: seed.pm1.id, dueDate: past } }),
      prisma.task.create({ data: { title: 'Overdue done test', projectId: seed.pm1Project.id, createdById: seed.pm1.id, dueDate: past, status: 'DONE' } }),
      prisma.task.create({ data: { title: 'Overdue future test', projectId: seed.pm1Project.id, createdById: seed.pm1.id, dueDate: future } }),
    ]);
    expect(await processOverdueTasks(new Date())).toBeGreaterThanOrEqual(1);
    await processOverdueTasks(new Date());
    expect(await prisma.task.findUnique({ where: { id: eligible.id } })).toMatchObject({ isOverdue: true });
    expect(await prisma.task.findUnique({ where: { id: done.id } })).toMatchObject({ isOverdue: false });
    expect(await prisma.task.findUnique({ where: { id: futureTask.id } })).toMatchObject({ isOverdue: false });
    const activities = await prisma.activityLog.findMany({ where: { taskId: eligible.id, type: 'TASK_MARKED_OVERDUE' } });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ source: 'SYSTEM', actorId: null });
    await prisma.task.deleteMany({ where: { id: { in: [eligible.id, done.id, futureTask.id] } } });
  });
});
