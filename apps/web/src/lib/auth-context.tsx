'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isDemoMode, setAccessToken, signIn, signOut, signUp } from './api';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const updateSession = useCallback(async (action: 'login' | 'register', input: string[]) => {
    const result =
      action === 'login'
        ? await signIn(input[0] ?? '', input[1] ?? '')
        : await signUp(input[0] ?? '', input[1] ?? '', input[2] ?? '');
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      setLoading(false);
      return;
    }
    let active = true;
    void fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'refresh' }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { accessToken: string; user: AuthUser };
      })
      .then((session) => {
        if (!active || !session) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logIn = useCallback(
    async (email: string, password: string) => updateSession('login', [email, password]),
    [updateSession],
  );
  const register = useCallback(
    async (email: string, password: string, name: string) =>
      updateSession('register', [email, password, name]),
    [updateSession],
  );
  const logOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, logIn, register, logOut }),
    [user, loading, logIn, register, logOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
