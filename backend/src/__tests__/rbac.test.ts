import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { login, authHeader, clearRefreshTokens, getSeedContext } from './helpers';

const app = createApp();

describe('RBAC and Core API', () => {
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => {
    seed = await getSeedContext();
  });

  beforeEach(async () => {
    await clearRefreshTokens();
  });

  it('allows admin to list users', async () => {
    const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

    const response = await request(app)
      .get('/api/users')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('denies PM access to admin-only user endpoint', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/users')
      .set(authHeader(accessToken))
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows admin and PM to list developers for task assignment', async () => {
    const admin = await login(app, 'admin@example.com', 'Admin123!Dev');
    const adminResponse = await request(app)
      .get('/api/users/developers')
      .set(authHeader(admin.accessToken))
      .expect(200);

    expect(adminResponse.body.data.length).toBeGreaterThan(0);
    expect(adminResponse.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      }),
    );
    expect(adminResponse.body.data[0]).not.toHaveProperty('role');

    const pm = await login(app, 'pm1@example.com', 'PM123!Dev');
    await request(app)
      .get('/api/users/developers')
      .set(authHeader(pm.accessToken))
      .expect(200);
  });

  it('denies developer access to developer listing endpoint', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .get('/api/users/developers')
      .set(authHeader(accessToken))
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows PM to read clients but not mutate them', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    await request(app).get('/api/clients').set(authHeader(accessToken)).expect(200);

    const response = await request(app)
      .post('/api/clients')
      .set(authHeader(accessToken))
      .send({ name: 'Unauthorized Client' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows PM to access own project only', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const own = await request(app)
      .get(`/api/projects/${seed.pm1Project.id}`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(own.body.data.id).toBe(seed.pm1Project.id);

    const cross = await request(app)
      .get(`/api/projects/${seed.pm2Project.id}`)
      .set(authHeader(accessToken))
      .expect(404);

    expect(cross.body.error.code).toBe('NOT_FOUND');
    expect(cross.body.data).toBeUndefined();
    expect(JSON.stringify(cross.body)).not.toContain(seed.pm2Project.name);
  });

  it('denies developer access to project endpoints', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .get('/api/projects')
      .set(authHeader(accessToken))
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows developer to access only assigned tasks', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const own = await request(app)
      .get(`/api/tasks/${seed.dev1Task.id}`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(own.body.data.id).toBe(seed.dev1Task.id);
    expect(own.body.data.assigneeId).toBe(seed.dev1.id);
    expect(own.body.data).not.toHaveProperty('passwordHash');

    const cross = await request(app)
      .get(`/api/tasks/${seed.dev2Task.id}`)
      .set(authHeader(accessToken))
      .expect(404);

    expect(cross.body.error.code).toBe('NOT_FOUND');
    expect(cross.body.data).toBeUndefined();
    expect(JSON.stringify(cross.body)).not.toContain(seed.dev2Task.title);
  });

  it('allows developer to update status on assigned task and creates activity log', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');
    const task = await prisma.task.findFirst({
      where: { assigneeId: seed.dev1.id, status: { not: 'DONE' } },
    });

    if (!task) {
      throw new Error('No updatable task for dev1');
    }

    const previousStatus = task.status;
    const nextStatus = previousStatus === 'TODO' ? 'IN_PROGRESS' : 'TODO';

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(authHeader(accessToken))
      .send({ status: nextStatus })
      .expect(200);

    expect(response.body.data.status).toBe(nextStatus);

    const activity = await prisma.activityLog.findFirst({
      where: {
        taskId: task.id,
        type: 'TASK_STATUS_CHANGED',
        previousStatus,
        newStatus: nextStatus,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(activity).toBeTruthy();
    expect(activity?.actorId).toBe(seed.dev1.id);

    await prisma.task.update({
      where: { id: task.id },
      data: { status: previousStatus },
    });
  });

  it('denies developer status update on unassigned task', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .patch(`/api/tasks/${seed.dev2Task.id}`)
      .set(authHeader(accessToken))
      .send({ status: 'IN_PROGRESS' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.data).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(seed.dev2Task.title);
  });

  it('denies developer from updating non-status fields', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .patch(`/api/tasks/${seed.dev1Task.id}`)
      .set(authHeader(accessToken))
      .send({ title: 'Hacked title' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lists only role-scoped tasks for developer', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .get('/api/tasks')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const task of response.body.data) {
      expect(task.assigneeId).toBe(seed.dev1.id);
    }
  });

  it('lists only own projects for PM', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/projects')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    for (const project of response.body.data) {
      expect(project.createdById).toBe(seed.pm1.id);
    }
  });

  it('returns validation error for invalid task status', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .patch(`/api/tasks/${seed.dev1Task.id}`)
      .set(authHeader(accessToken))
      .send({ status: 'BLOCKED' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
