import { Link } from "react-router-dom";
import { StsLogo } from "../base";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { GlobalSchoolFilterControl } from "../../features/school-filter/components/GlobalSchoolFilterControl";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { resolveApiMediaUrl } from "../../lib/media-url";
import { HeaderProfileMenu } from "./HeaderProfileMenu";
import { AppHeaderFrame, AppNavigationControls } from "./AppFrame";

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

  return (
    <AppHeaderFrame>
      <AppNavigationControls onMobileMenuClick={onMenuClick} />
      <Link aria-label="กลับหน้าหลัก" className="shrink-0" to="/">
        <StsLogo aria-hidden="true" className="size-9" />
      </Link>
      <div className="min-w-0 flex-1" />
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <GlobalSchoolFilterControl className="max-w-72 sm:max-w-96" />
        {canEditProfile ? <NotificationBell /> : null}
        <HeaderProfileMenu
          canEditProfile={canEditProfile}
          displayName={displayName}
          photoUrl={resolveApiMediaUrl(user?.photo_url ?? null)}
        />
      </div>
    </AppHeaderFrame>
  );
}
