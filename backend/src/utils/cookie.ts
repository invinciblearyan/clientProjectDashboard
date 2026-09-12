import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

function getRefreshCookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'strict',
    path: '/api/auth',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(env.refreshCookieName, token, getRefreshCookieOptions(SEVEN_DAYS_MS));
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(env.refreshCookieName, getRefreshCookieOptions());
}
