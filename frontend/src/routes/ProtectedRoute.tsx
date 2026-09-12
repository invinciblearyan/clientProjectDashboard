import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '../components/common/LoadingState';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/api';
import { getRoleHomePath, userHasRole } from '../utils/roles';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Checking session…" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !userHasRole(user, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function RoleHomeRedirect() {
  const { user, status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Loading workspace…" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}
