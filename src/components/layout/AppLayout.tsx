import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppFrame } from "./AppFrame";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const refreshUserProfile = useAuthSessionStore(
    (state) => state.refreshUserProfile,
  );

  useEffect(() => {
    let refreshing = false;
    const refreshCurrentAuthority = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        await refreshUserProfile();
      } finally {
        refreshing = false;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCurrentAuthority();
      }
    };

    void refreshCurrentAuthority();
    window.addEventListener("focus", refreshCurrentAuthority);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshCurrentAuthority);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUserProfile]);

  return (
    <AppFrame
      header={<AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />}
      sidebar={
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
      }
    >
      <Outlet />
    </AppFrame>
  );
}
