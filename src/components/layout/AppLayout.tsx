import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-app text-slate-900">
      {/* Full-width navy app bar; sidebar + content sit below it. */}
      <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
