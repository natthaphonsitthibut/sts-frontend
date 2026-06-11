import { useMemo } from "react";
import { ROLE_LABELS } from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import type { AuthUser } from "../../auth/types/auth.types";

const DEFAULT_DISPLAY_NAME = "ผู้ใช้งาน";

export interface CurrentUserPresentation {
  user: AuthUser | null;
  displayName: string;
  roleLabel: string;
  initials: string;
  affiliation: string;
}

function deriveDisplayName(user: AuthUser): string {
  const { FirstName, LastName, username } = user;
  if (FirstName && LastName) {
    return `${FirstName} ${LastName}`;
  }
  if (FirstName) {
    return FirstName;
  }
  return username || DEFAULT_DISPLAY_NAME;
}

function deriveRoleLabel(user: AuthUser): string {
  const labels = user.labels ?? [];
  if (labels.length > 0) {
    return labels.join(", ");
  }

  const roles = user.roles ?? [];
  if (roles.length > 0) {
    return roles.map((role) => ROLE_LABELS[role] || role).join(", ");
  }

  return DEFAULT_DISPLAY_NAME;
}

function deriveInitials(user: AuthUser): string {
  if (user.FirstName) {
    return user.FirstName.charAt(0).toUpperCase();
  }
  if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }
  return "U";
}

export function useCurrentUserPresentation(): CurrentUserPresentation {
  const user = useAuthSessionStore((state) => state.user);

  return useMemo<CurrentUserPresentation>(() => {
    if (!user) {
      return {
        user: null,
        displayName: DEFAULT_DISPLAY_NAME,
        roleLabel: DEFAULT_DISPLAY_NAME,
        initials: "U",
        affiliation: "-",
      };
    }

    return {
      user,
      displayName: deriveDisplayName(user),
      roleLabel: deriveRoleLabel(user),
      initials: deriveInitials(user),
      affiliation: user.affiliation || "-",
    };
  }, [user]);
}
