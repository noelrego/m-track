import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { CurrentUserResponse } from '../../common';
import { apiFetch } from '../../shared/api/api-client';
import { useAuthStore } from '../store/auth.store';
import { AuthRouteLoader } from './AuthRouteLoader';

interface PublicOnlyRouteProps {
  children: ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const location = useLocation();
  const clearUser = useAuthStore((state) => state.clearUser);
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'guest'>(
    'checking',
  );

  useEffect(() => {
    let isMounted = true;
    const routeState = location.state as { fromLogout?: boolean } | null;

    if (routeState?.fromLogout) {
      clearUser();
      setStatus('guest');

      return () => {
        isMounted = false;
      };
    }

    apiFetch('/me')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session check failed');
        }

        const data = (await response.json()) as CurrentUserResponse;

        if (isMounted) {
          setUser(data.user);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        clearUser();

        if (isMounted) {
          setStatus('guest');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clearUser, location.state, setUser]);

  if (status === 'checking') {
    return <AuthRouteLoader />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />;
  }

  return children;
}
