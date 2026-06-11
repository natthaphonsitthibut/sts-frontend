import { Bell, GraduationCap, Menu, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, IconButton } from "../base";
import { hasPermission, getEffectivePermissions } from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { getPageTitle } from "./page-title";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const location = useLocation();
  const user = useAuthSessionStore((state) => state.user);
  const userPermissions = getEffectivePermissions(user?.roles || [], user?.permissions || []);
  const canOpenSettings = hasPermission(userPermissions, "settings");

  const displayName =
    [user?.FirstName, user?.LastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "ผู้ใช้งาน";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "U";

  return (
    <header className="sticky top-0 z-30 h-16 bg-primary-dark text-white shadow-card">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <IconButton
          aria-label="เปิดเมนู"
          className="text-white hover:bg-white/15 hover:text-white lg:hidden"
          icon={Menu}
          onClick={onMenuClick}
          variant="ghost"
        />
        {/* Brand (left) — aligned over the sidebar width on desktop. */}
        <div className="flex shrink-0 items-center gap-3 lg:w-[228px]">
          <GraduationCap className="size-7 shrink-0 text-white" aria-hidden="true" />
          <span className="truncate text-base font-semibold text-white">
            ระบบติดตามนักเรียน
          </span>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold leading-8 text-white">
          {getPageTitle(location.pathname)}
        </h1>
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="รายการแจ้งเตือน"
            className="text-white hover:bg-white/10 hover:text-white"
            icon={Bell}
            variant="ghost"
          />
          {canOpenSettings ? (
            <Link
              aria-label="ตั้งค่าระบบ"
              className="inline-flex size-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark"
              to="/settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
          ) : null}
          <div className="ml-1 hidden items-center gap-2 border-l border-white/20 pl-3 sm:flex">
            <Avatar
              fallback={initials}
              className="size-9 bg-white font-semibold text-primary"
            />
            <span className="max-w-[140px] truncate text-sm font-semibold text-white">
              {displayName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
