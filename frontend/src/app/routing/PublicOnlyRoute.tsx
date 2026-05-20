import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasAuthSession } from '../../shared/auth/auth-session';

interface PublicOnlyRouteProps {
  children: ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  if (hasAuthSession()) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
