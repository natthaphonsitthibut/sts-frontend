import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppFrame } from "./AppFrame";

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
