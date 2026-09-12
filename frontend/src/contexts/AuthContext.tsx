import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth.api';
import { setAccessToken, setSessionExpiredHandler } from '../api/client';
import type { PublicUser } from '../types/api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);

    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await authApi.refresh();
        if (cancelled) return;
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        clearSession();
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    setStatus('authenticated');
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Cookie may already be cleared; always reset local session.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      login,
      logout,
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
