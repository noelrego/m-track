import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../../common';
import { useAuthStore } from '../store/auth.store';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
