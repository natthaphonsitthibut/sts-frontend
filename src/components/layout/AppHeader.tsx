import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { getNameInitials } from "../../lib/person-name";
import { HeaderProfileMenu } from "./HeaderProfileMenu";
import { AppBrand, AppHeaderFrame, AppNavigationControls } from "./AppFrame";

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
  const initials = getNameInitials(displayName);

  return (
    <AppHeaderFrame>
      <AppNavigationControls onMobileMenuClick={onMenuClick} />
      <AppBrand />
      <div className="flex items-center gap-3">
        {canEditProfile ? <NotificationBell /> : null}
        <HeaderProfileMenu
          canEditProfile={canEditProfile}
          displayName={displayName}
          initials={initials}
        />
      </div>
    </AppHeaderFrame>
  );
}
