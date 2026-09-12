import { getApiBaseUrl } from '../config/env';
import type { ApiErrorBody } from '../types/api';
import { ApiRequestError } from '../types/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Internal flag to prevent infinite refresh loops. */
  _retried?: boolean;
  /** Skip attaching Authorization header (e.g. login). */
  skipAuth?: boolean;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

async function parseErrorResponse(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.error?.code && body?.error?.message) {
      return new ApiRequestError(response.status, body.error);
    }
  } catch {
    // fall through
  }

  return new ApiRequestError(response.status, {
    code: 'HTTP_ERROR',
    message: response.statusText || 'Request failed',
  });
}

async function performRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { data: { accessToken: string } };
      const token = payload.data.accessToken;
      accessToken = token;
      return token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, _retried = false, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth && !_retried) {
    const newToken = await performRefresh();

    if (newToken) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }

    accessToken = null;
    onSessionExpired?.();
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}

export async function refreshSession(): Promise<{ accessToken: string } | null> {
  const token = await performRefresh();
  return token ? { accessToken: token } : null;
}
