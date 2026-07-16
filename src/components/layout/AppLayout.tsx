import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-page text-slate-900">
      {/* Full-width navy app bar; sidebar + content sit below it. */}
      <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        {/* `relative` anchors any absolutely-positioned descendant that has no
            closer positioned ancestor (e.g. an `sr-only` field label) to this
            scroll container. Without it their containing block is <html>, so
            one sitting below the fold escapes both this scroller and the
            overflow-hidden shell and stretches the document — the page then
            scrolls past its own content into a void. */}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
