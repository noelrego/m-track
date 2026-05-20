import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasAuthSession } from '../../shared/auth/auth-session';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
