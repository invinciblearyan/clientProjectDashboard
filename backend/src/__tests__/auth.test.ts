import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import {
  login,
  authHeader,
  getRefreshCookie,
  clearRefreshTokens,
} from './helpers';

const app = createApp();

describe('Authentication', () => {
  beforeEach(async () => {
    await clearRefreshTokens();
  });

  it('logs in with valid credentials and returns access token without refresh token in body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin123!Dev' })
      .expect(200);

    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.refreshToken).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('refreshToken');

    const cookies = response.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith(`${env.refreshCookieName}=`))).toBe(true);
  });

  it('rejects invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.requestId).toBeTruthy();
  });

  it('rejects inactive user', async () => {
    const inactive = await prisma.user.create({
      data: {
        email: 'inactive-test@example.com',
        passwordHash: '$2b$12$placeholderhashplaceholderhashpl',
        name: 'Inactive User',
        role: 'DEVELOPER',
        isActive: false,
      },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: inactive.email, password: 'any-password' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');

    await prisma.user.delete({ where: { id: inactive.id } });
  });

  it('rejects missing access token on protected endpoint', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid access token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set(authHeader('invalid.token.value'))
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refreshes access token and rotates refresh cookie', async () => {
    const { cookies } = await login(app, 'pm1@example.com', 'PM123!Dev');
    const oldCookie = getRefreshCookie(cookies);

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(200);

    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('refreshToken');

    const newCookies = response.headers['set-cookie'] as string[];
    const newCookie = getRefreshCookie(newCookies);
    expect(newCookie).not.toBe(oldCookie);
  });

  it('rejects reused refresh token after rotation', async () => {
    const { cookies } = await login(app, 'dev1@example.com', 'Dev123!Dev');
    const oldCookie = getRefreshCookie(cookies);

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(200);

    const newCookie = getRefreshCookie(refreshResponse.headers['set-cookie'] as string[]);

    const reuseResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(401);

    expect(reuseResponse.body.error.code).toBe('UNAUTHORIZED');

    const afterRevokeResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', newCookie)
      .expect(401);

    expect(afterRevokeResponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logs out and revokes refresh token', async () => {
    const { cookies } = await login(app, 'dev2@example.com', 'Dev456!Dev');
    const cookie = getRefreshCookie(cookies);

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns current user for valid access token', async () => {
    const { accessToken } = await login(app, 'admin@example.com', 'Admin123!Dev');

    const response = await request(app)
      .get('/api/auth/me')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body.data.email).toBe('admin@example.com');
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects refresh when user is deactivated after login', async () => {
    const tempUser = await prisma.user.create({
      data: {
        email: 'deactivate-refresh-test@example.com',
        passwordHash: await import('bcrypt').then((b) =>
          b.hash('TempPass123!', 12),
        ),
        name: 'Deactivate Refresh Test',
        role: 'DEVELOPER',
        isActive: true,
      },
    });

    const { cookies } = await login(app, tempUser.email, 'TempPass123!');
    const cookie = getRefreshCookie(cookies);

    await prisma.user.update({
      where: { id: tempUser.id },
      data: { isActive: false },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: tempUser.id },
      data: { revokedAt: new Date() },
    });

    const loginAfterDeactivate = await request(app)
      .post('/api/auth/login')
      .send({ email: tempUser.email, password: 'TempPass123!' })
      .expect(401);

    expect(loginAfterDeactivate.body.data).toBeUndefined();

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);

    expect(response.body.data).toBeUndefined();
    expect(response.body.error.code).toBe('UNAUTHORIZED');

    await prisma.user.delete({ where: { id: tempUser.id } });
  });

  it('does not issue credentials for invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${env.refreshCookieName}=not.a.valid.jwt`)
      .expect(401);

    expect(response.body.data).toBeUndefined();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(JSON.stringify(response.body)).not.toContain('accessToken');
  });

  it('does not accept refresh token from Authorization header or body', async () => {
    const { cookies, accessToken } = await login(app, 'pm2@example.com', 'PM456!Dev');
    const cookieValue = getRefreshCookie(cookies).split('=')[1];

    const headerAttempt = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${cookieValue}`)
      .expect(401);

    expect(headerAttempt.body.data).toBeUndefined();

    const bodyAttempt = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: cookieValue })
      .expect(401);

    expect(bodyAttempt.body.data).toBeUndefined();

    await request(app)
      .get('/api/auth/me')
      .set(authHeader(accessToken))
      .expect(200);
  });

  it('allows only one successful refresh when the same token is used concurrently', async () => {
    const { cookies } = await login(app, 'dev3@example.com', 'Dev789!Dev');
    const cookie = getRefreshCookie(cookies);

    const [first, second] = await Promise.all([
      request(app).post('/api/auth/refresh').set('Cookie', cookie),
      request(app).post('/api/auth/refresh').set('Cookie', cookie),
    ]);

    const successes = [first, second].filter((response) => response.status === 200);
    const failures = [first, second].filter((response) => response.status === 401);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(successes[0].body.data.accessToken).toBeTruthy();
    expect(successes[0].body.data).not.toHaveProperty('refreshToken');
    expect(JSON.stringify(successes[0].body)).not.toContain('refreshToken');
  });

  it('logout is idempotent for missing or already revoked cookies', async () => {
    await request(app).post('/api/auth/logout').expect(200);

    const { cookies } = await login(app, 'dev4@example.com', 'Dev012!Dev');
    const cookie = getRefreshCookie(cookies);

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
  });

  it('returns structured validation error for invalid login body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toBeDefined();
    expect(response.body.error.requestId).toBeTruthy();
  });
});
