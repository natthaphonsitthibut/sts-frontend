import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getEffectivePermissions,
  hasPermission,
  isStudentSelfSession,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string | string[];
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const location = useLocation();
  const user = useAuthSessionStore((state) => state.user);
  const hasAdminAccess = useAuthSessionStore((state) => state.hasAdminAccess);

  const session = { user, hasAdminAccess };
  const isAuthenticated = Boolean(session.user && session.hasAdminAccess);
  const nextPath = `${location.pathname}${location.search}`;
  const isChangePasswordRoute = location.pathname === "/change-password";

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        state={{ from: location }}
        to={`/login?next=${encodeURIComponent(nextPath)}`}
      />
    );
  }

  if (session.user?.must_change_password && !isChangePasswordRoute) {
    return <Navigate replace to="/change-password" />;
  }

  if (permission) {
    const userPermissions = getEffectivePermissions(
      session.user?.roles || [],
      session.user?.permissions || [],
    );

    const allowed = Array.isArray(permission)
      ? permission.some((permissionId) => hasPermission(userPermissions, permissionId))
      : hasPermission(userPermissions, permission);
    if (!allowed) {
      if (isStudentSelfSession(session.user)) {
        return <Navigate replace to="/my-attendance" />;
      }
      return <Navigate replace to="/forbidden" />;
    }
  }

  return children;
}
