import { Bell, Menu, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { IconButton } from "../base";
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

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-full items-center px-4 lg:px-6">
        <IconButton
          aria-label="เปิดเมนู"
          className="mr-3 text-primary lg:hidden"
          icon={Menu}
          onClick={onMenuClick}
          variant="ghost"
        />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-800">
          {getPageTitle(location.pathname)}
        </h1>
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="รายการแจ้งเตือน"
            className="border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            icon={Bell}
            variant="ghost"
          />
          {canOpenSettings ? (
            <Link
              aria-label="ตั้งค่าระบบ"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              to="/settings"
            >
              <Settings className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
