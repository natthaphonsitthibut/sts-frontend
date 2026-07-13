import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getEffectivePermissions,
  hasPermission,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const location = useLocation();
  const user = useAuthSessionStore((state) => state.user);
  const hasAdminAccess = useAuthSessionStore((state) => state.hasAdminAccess);
  const loadSession = useAuthSessionStore((state) => state.loadSession);

  const session = user ? { user, hasAdminAccess } : loadSession();
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

    if (!hasPermission(userPermissions, permission)) {
      return <Navigate replace to="/forbidden" />;
    }
  }

  return children;
}
