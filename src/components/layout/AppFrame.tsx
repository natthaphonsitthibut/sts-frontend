import { Menu } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconButton, StsLogo } from "../base";
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
      <div className="flex h-full items-center gap-3 px-4 lg:pl-5 lg:pr-6">
        {children}
      </div>
    </header>
  );
}

export function AppNavigationControls({
  onMobileMenuClick,
}: {
  onMobileMenuClick: () => void;
}) {
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

export function AppBrand({
  className,
  label = "ระบบติดตามผู้เรียน",
  onClick,
  to = "/",
}: {
  className?: string;
  label?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  to?: string;
}) {
  return (
    <Link
      aria-label="กลับหน้าหลัก"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      onClick={onClick}
      to={to}
    >
      <StsLogo aria-hidden="true" className="size-9 shrink-0" />
      <span className="truncate text-xl font-bold text-primary">{label}</span>
    </Link>
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
          "min-h-0 flex-1 overflow-y-auto px-2 py-4",
          "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
        )}
      >
        <div className="space-y-0.5">
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
