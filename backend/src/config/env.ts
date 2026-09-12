import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getPort(): number {
  const port = process.env.PORT ?? '3000';
  const parsed = Number.parseInt(port, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid PORT value: ${port}`);
  }

  return parsed;
}

function getBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'false';
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: getPort(),
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  jwtAccessSecret: getRequiredEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  refreshCookieName: 'refreshToken',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  overdueCronSchedule: process.env.OVERDUE_CRON_SCHEDULE ?? ((process.env.NODE_ENV ?? 'development') === 'production' ? '0 * * * *' : '*/5 * * * *'),
  enableCronJobs: getBooleanEnv('ENABLE_CRON_JOBS', (process.env.NODE_ENV ?? 'development') !== 'test'),
};
