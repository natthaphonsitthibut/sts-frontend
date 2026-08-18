import { useMemo } from "react";
import {
  canOpenRoute,
  getEffectivePermissions,
  hasPermission,
} from "../lib/permissions";
import { useAuthSessionStore } from "../store/auth-session.store";

/**
 * Effective permissions for the current session plus a `can(id)` helper.
 * Central source of truth for permission-gating UI (buttons, links, sections)
 * so views never re-derive permissions ad hoc.
 */
export function usePermissions() {
  const user = useAuthSessionStore((state) => state.user);

  return useMemo(() => {
    const permissions = getEffectivePermissions(
      user?.roles ?? [],
      user?.permissions ?? [],
    );
    return {
      permissions,
      can: (permissionId: string) => hasPermission(permissions, permissionId),
      canOpen: (route: string) => canOpenRoute(permissions, route),
    };
  }, [user]);
}
