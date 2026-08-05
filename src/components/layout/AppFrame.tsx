import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton, SchoolIcon } from "../base";
import type { MenuItem } from "../../features/auth/lib/permissions";
import { cn } from "../../lib/utils";
import { collectMenuRoutes } from "./menu-routes";
import { SidebarNavItem } from "./SidebarNavItem";
import { useSidebarUiStore } from "./sidebar-ui.store";

export function AppFrame({
  children,
  header,
  sidebar,
}: {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-page text-slate-900">
      {header}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface-page">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppHeaderFrame({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 lg:pl-5 lg:pr-6">{children}</div>
    </header>
  );
}

export function AppNavigationControls({ onMobileMenuClick }: { onMobileMenuClick: () => void }) {
  const collapsed = useSidebarUiStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarUiStore((state) => state.toggleCollapsed);
  return (
    <>
      <IconButton
        aria-label="เปิดเมนู"
        className="border-transparent bg-transparent text-slate-600 hover:border-transparent hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        icon={Menu}
        iconClassName="size-5"
        onClick={onMobileMenuClick}
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
    </>
  );
}

export function AppBrand() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <SchoolIcon aria-hidden="true" className="size-7 shrink-0 text-primary" />
      <span className="truncate text-xl font-bold text-primary">ระบบติดตามนักเรียน</span>
    </div>
  );
}

export function SidebarMenuContent({
  collapsed = false,
  items,
  onNavigate,
}: {
  collapsed?: boolean;
  items: MenuItem[];
  onNavigate?: () => void;
}) {
  const menuRoutes = collectMenuRoutes(items);
  return (
    <div className="flex h-full flex-col bg-white">
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-2",
          "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "pt-2 pb-4" : "py-4",
        )}
      >
        <div
          className={cn(
            "truncate overflow-hidden px-3 text-xs font-semibold text-slate-500",
            "transition-[opacity,max-width,max-height,margin] duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "max-h-0 max-w-0 opacity-0" : "mb-2 max-h-9 max-w-48 opacity-100",
          )}
        >
          เมนู
        </div>
        <div className={cn("space-y-0.5", collapsed && "space-y-2")}>
          {items.map((item) => (
            <SidebarNavItem
              collapsed={collapsed}
              item={item}
              key={item.id}
              menuRoutes={menuRoutes}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
