import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, IconButton } from "../base";
import { ROLE_LABELS } from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { authService } from "../../features/auth/api/auth.service";

function getDisplayName(firstName?: string | null, lastName?: string | null, username?: string): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || username || "ผู้ใช้งาน";
}

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function UserProfileMenu() {
  const navigate = useNavigate();
  const user = useAuthSessionStore((state) => state.user);
  const clearSession = useAuthSessionStore((state) => state.clearSession);

  const displayName = getDisplayName(user?.FirstName, user?.LastName, user?.username);
  const primaryRole = user?.roles?.[0];
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : "-";

  async function handleLogout(): Promise<void> {
    // Best-effort: clear the server cookie, then always clear local state.
    try {
      await authService.logout();
    } catch {
      // Ignore — local session is cleared regardless below.
    }
    clearSession();
    void navigate("/admin-access");
  }

  return (
    <div className="flex items-center gap-3 bg-muted/60 px-4 py-4">
      <Avatar fallback={getInitials(displayName)} className="size-10 bg-surface-sky text-primary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
        <div className="truncate text-xs text-slate-400">{roleLabel}</div>
      </div>
      <IconButton
        aria-label="ออกจากระบบ"
        className="text-primary"
        icon={LogOut}
        onClick={() => void handleLogout()}
        variant="ghost"
      />
    </div>
  );
}
