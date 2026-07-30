import { Menu } from "lucide-react";
import { SchoolIcon } from "../base";
import { IconButton } from "../base";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { HeaderProfileMenu } from "./HeaderProfileMenu";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const user = useAuthSessionStore((state) => state.user);
  const canEditProfile = !user?.virtual_login;

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
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <IconButton
          aria-label="เปิดเมนู"
          className="border-white bg-white text-primary-dark hover:border-white hover:bg-primary-soft hover:text-primary-dark lg:hidden"
          icon={Menu}
          onClick={onMenuClick}
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
