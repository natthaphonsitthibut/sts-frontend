import { Menu } from "lucide-react";
import { SchoolIcon } from "../base";
import { IconButton } from "../base";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { getNameInitials } from "../../lib/person-name";
import { HeaderProfileMenu } from "./HeaderProfileMenu";
import { useSidebarUiStore } from "./sidebar-ui.store";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const user = useAuthSessionStore((state) => state.user);
  const canEditProfile = !user?.virtual_login;
  const collapsed = useSidebarUiStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarUiStore((state) => state.toggleCollapsed);

  const displayName =
    [user?.FirstName, user?.LastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "ผู้ใช้งาน";
  const initials = getNameInitials(displayName);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 lg:pr-6 lg:pl-5">
        <IconButton
          aria-label="เปิดเมนู"
          className="border-transparent bg-transparent text-slate-600 hover:border-transparent hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          icon={Menu}
          iconClassName="size-5"
          onClick={onMenuClick}
          variant="ghost"
        />
        <IconButton
          aria-expanded={!collapsed}
          aria-label={collapsed ? "ขยายเมนูด้านข้าง" : "พับเมนูด้านข้าง"}
          className="hidden border-transparent bg-transparent text-slate-600 hover:border-transparent hover:bg-slate-100 hover:text-slate-900 lg:inline-flex"
          icon={Menu}
          iconClassName="size-5"
          onClick={toggleCollapsed}
          title={collapsed ? "ขยายเมนู" : "พับเมนู"}
          variant="ghost"
        />
        {/* Brand (left) — aligned over the sidebar width on desktop. */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SchoolIcon className="size-7 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate text-xl font-bold text-primary">ระบบติดตามนักเรียน</span>
        </div>
        <div className="flex items-center gap-3">
          {canEditProfile ? <NotificationBell /> : null}
          <HeaderProfileMenu
            canEditProfile={canEditProfile}
            displayName={displayName}
            initials={initials}
          />
        </div>
      </div>
    </header>
  );
}
