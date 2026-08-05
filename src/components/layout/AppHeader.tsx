import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { resolveApiMediaUrl } from "../../lib/media-url";
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

  return (
    <AppHeaderFrame>
      <AppNavigationControls onMobileMenuClick={onMenuClick} />
      <AppBrand />
      <div className="flex items-center gap-3">
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
