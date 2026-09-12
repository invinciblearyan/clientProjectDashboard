import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { authHeader, clearRefreshTokens, getSeedContext, login } from './helpers';

const app = createApp();

describe('TaskPriority CRITICAL support', () => {
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => {
    seed = await getSeedContext();
  });

  beforeEach(async () => {
    await clearRefreshTokens();
  });

  it('allows PM to create a task with CRITICAL priority', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .post('/api/tasks')
      .set(authHeader(accessToken))
      .send({
        title: 'Critical security patch',
        priority: 'CRITICAL',
        projectId: seed.pm1Project.id,
        assigneeId: seed.dev1.id,
      })
      .expect(201);

    expect(response.body.data.priority).toBe('CRITICAL');

    await prisma.task.delete({ where: { id: response.body.data.id } });
  });

  it('allows PM to update task priority to CRITICAL', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Priority update target',
        priority: 'LOW',
        projectId: seed.pm1Project.id,
        assigneeId: seed.dev1.id,
        createdById: seed.pm1.id,
      },
    });

    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(authHeader(accessToken))
      .send({ priority: 'CRITICAL' })
      .expect(200);

    expect(response.body.data.priority).toBe('CRITICAL');

    await prisma.task.delete({ where: { id: task.id } });
  });

  it('rejects invalid priority values on create', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .post('/api/tasks')
      .set(authHeader(accessToken))
      .send({
        title: 'Invalid priority task',
        priority: 'URGENT',
        projectId: seed.pm1Project.id,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid priority values on update', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .patch(`/api/tasks/${seed.dev1Task.id}`)
      .set(authHeader(accessToken))
      .send({ priority: 'URGENT' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('still accepts LOW, MEDIUM, and HIGH priorities', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    for (const priority of ['LOW', 'MEDIUM', 'HIGH'] as const) {
      const response = await request(app)
        .post('/api/tasks')
        .set(authHeader(accessToken))
        .send({
          title: `Task with ${priority} priority`,
          priority,
          projectId: seed.pm1Project.id,
        })
        .expect(201);

      expect(response.body.data.priority).toBe(priority);
      await prisma.task.delete({ where: { id: response.body.data.id } });
    }
  });

  it('filters task list by CRITICAL priority for PM', async () => {
    const criticalTask = await prisma.task.create({
      data: {
        title: 'Filter critical task',
        priority: 'CRITICAL',
        projectId: seed.pm1Project.id,
        assigneeId: seed.dev1.id,
        createdById: seed.pm1.id,
      },
    });

    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/tasks?priority=CRITICAL')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.some((task: { id: string }) => task.id === criticalTask.id)).toBe(
      true,
    );
    for (const task of response.body.data) {
      expect(task.priority).toBe('CRITICAL');
    }

    await prisma.task.delete({ where: { id: criticalTask.id } });
  });

  it('includes CRITICAL in PM dashboard tasksByPriority counts', async () => {
    const criticalTask = await prisma.task.create({
      data: {
        title: 'Dashboard critical count',
        priority: 'CRITICAL',
        projectId: seed.pm1Project.id,
        createdById: seed.pm1.id,
      },
    });

    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/dashboard')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.tasksByPriority).toHaveProperty('CRITICAL');
    expect(response.body.data.tasksByPriority.CRITICAL).toBeGreaterThan(0);

    await prisma.task.delete({ where: { id: criticalTask.id } });
  });
});
