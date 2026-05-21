import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { apiFetch } from '../../shared/api/api-client';
import type { CurrentUserResponse } from '../../common';
import { useAuthStore } from '../store/auth.store';
import { AuthRouteLoader } from './AuthRouteLoader';

interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const clearUser = useAuthStore((state) => state.clearUser);
  const setUser = useAuthStore((state) => state.setUser);
  const token = useAuthStore((state) => state.token);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'guest'>(
    'checking',
  );

  useEffect(() => {
    let isMounted = true;

    if (!token) {
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
  }, [clearUser, setUser, token]);

  if (status === 'checking') {
    return <AuthRouteLoader />;
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
