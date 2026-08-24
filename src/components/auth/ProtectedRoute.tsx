import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getEffectivePermissions,
  hasPermission,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string | string[];
  role?: string | string[];
  requireGlobalScope?: boolean;
}

export function ProtectedRoute({
  children,
  permission,
  requireGlobalScope = false,
  role,
}: ProtectedRouteProps) {
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
      ? permission.some((permissionId) =>
          hasPermission(userPermissions, permissionId),
        )
      : hasPermission(userPermissions, permission);
    if (!allowed) {
      return <Navigate replace to="/forbidden" />;
    }
  }

  if (role) {
    const acceptedRoles = Array.isArray(role) ? role : [role];
    const allowed = acceptedRoles.some((roleId) =>
      session.user?.roles.includes(roleId),
    );
    if (!allowed) return <Navigate replace to="/forbidden" />;
  }

  if (requireGlobalScope && session.user?.data_scope?.global !== true) {
    return <Navigate replace to="/forbidden" />;
  }

  return children;
}
