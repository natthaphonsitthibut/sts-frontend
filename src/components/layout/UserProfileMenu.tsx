import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, IconButton } from "../base";
import { ROLE_LABELS } from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { authService } from "../../features/auth/api/auth.service";
import { cn } from "../../lib/utils";

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

interface UserProfileMenuProps {
  collapsed?: boolean;
}

export function UserProfileMenu({ collapsed = false }: UserProfileMenuProps) {
  const navigate = useNavigate();
  const user = useAuthSessionStore((state) => state.user);
  const clearSession = useAuthSessionStore((state) => state.clearSession);

  const displayName = getDisplayName(user?.FirstName, user?.LastName, user?.username);
  const primaryRole = user?.roles?.[0];
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : "-";
  // Magic/virtual sessions have no editable account, so hide the profile link.
  const canEditProfile = !user?.virtual_login;

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
    <div
      className={cn(
        "flex items-center gap-3 border-t border-slate-200 p-3",
        collapsed && "flex-col gap-1.5 px-2",
      )}
    >
      {canEditProfile ? (
        <Link
          aria-label="โปรไฟล์ของฉัน"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            collapsed && "flex-none",
          )}
          title={collapsed ? "โปรไฟล์ของฉัน" : undefined}
          to="/profile"
        >
          <Avatar
            fallback={getInitials(displayName)}
            className="size-10 bg-primary-soft font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          />
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
            <div className="truncate text-xs text-slate-500">{roleLabel}</div>
          </div>
        </Link>
      ) : (
        <>
          <Avatar
            fallback={getInitials(displayName)}
            className="size-10 bg-primary-soft font-semibold text-primary"
          />
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
            <div className="truncate text-xs text-slate-500">{roleLabel}</div>
          </div>
        </>
      )}
      <IconButton
        aria-label="ออกจากระบบ"
        className={cn(
          "border-transparent bg-transparent text-slate-500 shadow-none hover:bg-danger-100 hover:text-danger",
          collapsed && "size-10",
        )}
        icon={LogOut}
        onClick={() => void handleLogout()}
        title={collapsed ? `ออกจากระบบ: ${displayName}` : undefined}
        variant="ghost"
      />
    </div>
  );
}
