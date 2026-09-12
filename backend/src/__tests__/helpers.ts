import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';

export async function login(
  app: Express,
  email: string,
  password: string,
): Promise<{ accessToken: string; cookies: string[] }> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = response.headers['set-cookie'] as string[] | undefined;

  return {
    accessToken: response.body.data.accessToken,
    cookies: cookies ?? [],
  };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getRefreshCookie(cookies: string[]): string {
  const cookie = cookies.find((c) => c.startsWith(`${env.refreshCookieName}=`));
  if (!cookie) {
    throw new Error('Refresh cookie not found');
  }
  return cookie.split(';')[0];
}

export async function getSeedContext() {
  const [pm1, pm2, dev1, dev2] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'pm1@example.com' } }),
    prisma.user.findUnique({ where: { email: 'pm2@example.com' } }),
    prisma.user.findUnique({ where: { email: 'dev1@example.com' } }),
    prisma.user.findUnique({ where: { email: 'dev2@example.com' } }),
  ]);

  if (!pm1 || !pm2 || !dev1 || !dev2) {
    throw new Error('Seed data not found. Run npm run db:seed first.');
  }

  const pm1Project = await prisma.project.findFirst({
    where: { createdById: pm1.id },
  });
  const pm2Project = await prisma.project.findFirst({
    where: { createdById: pm2.id },
  });

  const dev1Task = await prisma.task.findFirst({
    where: { assigneeId: dev1.id },
  });
  const dev2Task = await prisma.task.findFirst({
    where: { assigneeId: dev2.id },
  });

  if (!pm1Project || !pm2Project || !dev1Task || !dev2Task) {
    throw new Error('Seed projects/tasks not found.');
  }

  return { pm1, pm2, dev1, dev2, pm1Project, pm2Project, dev1Task, dev2Task };
}

export async function clearRefreshTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany();
}
