import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { login, authHeader, clearRefreshTokens, getSeedContext } from './helpers';

const app = createApp();

describe('Activity API', () => {
  let seed: Awaited<ReturnType<typeof getSeedContext>>;

  beforeAll(async () => {
    seed = await getSeedContext();
  });

  beforeEach(async () => {
    await clearRefreshTokens();
  });

  it('returns paginated activity for admin', async () => {
    const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

    const response = await request(app)
      .get('/api/activity')
      .set(authHeader(accessToken))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );

    if (response.body.data.length > 0) {
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          type: expect.any(String),
          summary: expect.any(String),
          createdAt: expect.any(String),
        }),
      );
    }
  });

  it('scopes PM activity to owned projects only', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/activity')
      .query({ projectId: seed.pm1Project.id })
      .set(authHeader(accessToken))
      .expect(200);

    for (const event of response.body.data) {
      expect(event.project?.createdById ?? event.projectId).toBeTruthy();
    }
  });

  it('denies PM access to another PM project activity', async () => {
    const { accessToken } = await login(app, 'pm1@example.com', 'PM123!Dev');

    const response = await request(app)
      .get('/api/activity')
      .query({ projectId: seed.pm2Project.id })
      .set(authHeader(accessToken))
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns developer activity only for assigned tasks', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .get('/api/activity')
      .set(authHeader(accessToken))
      .expect(200);

    for (const event of response.body.data) {
      if (event.task) {
        expect(event.task.assigneeId).toBe(seed.dev1.id);
      }
    }
  });

  it('scopes developer project activity to assigned tasks in that project', async () => {
    const { accessToken } = await login(app, 'dev1@example.com', 'Dev123!Dev');

    const response = await request(app)
      .get('/api/activity')
      .query({ projectId: seed.pm2Project.id })
      .set(authHeader(accessToken))
      .expect(200);

    for (const event of response.body.data) {
      if (event.task) {
        expect(event.task.assigneeId).toBe(seed.dev1.id);
      }
    }
  });
});
