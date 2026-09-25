import { Menu } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconButton, StsLogo } from "../base";
import {
  buildMenuSections,
  type DataScope,
  type MenuItem,
} from "../../features/auth/lib/permissions";
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
  /**
   * Where the brand leads. `null` renders it as plain text — a surface with
   * nowhere of its own to go back to (a link page has no home inside the app)
   * must not offer a link that lands its holder on the sign-in screen.
   */
  to?: string | null;
}) {
  const content = (
    <>
      <StsLogo aria-hidden="true" className="size-9 shrink-0" />
      <span className="truncate text-xl font-bold text-primary">{label}</span>
    </>
  );
  // `select-none` so the brand behaves the same everywhere: dragging across it
  // moves nothing and highlights nothing, exactly as the anchor version does
  // inside the app.
  const shared = "flex min-w-0 select-none items-center gap-3 rounded-lg";
  if (to === null) {
    return <span className={cn(shared, className)}>{content}</span>;
  }
  return (
    <Link
      aria-label="กลับหน้าหลัก"
      className={cn(
        shared,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      onClick={onClick}
      to={to}
    >
      {content}
    </Link>
  );
}

/**
 * One sidebar section. "เมนูส่วนโรงเรียน" / "เมนูส่วนสภา" headers are always
 * expanded, by the owner's call (2026-09-22): unlike a `SidebarNavItem` group,
 * a section never folds. The icon rail has no room for the header text, so it
 * keeps the section's place with a rule instead — same entries, same order.
 */
function SidebarSection({
  collapsed,
  items,
  label,
  menuRoutes,
  onNavigate,
}: {
  collapsed: boolean;
  items: MenuItem[];
  label: string | null;
  menuRoutes: string[];
  onNavigate?: () => void;
}) {
  return (
    <div>
      {label !== null ? (
        // The header keeps its height in the rail, where a rule stands in for
        // text that has no room, so no row moves when the sidebar folds.
        <div className="relative flex min-h-8 items-center px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span
            className={cn(
              "truncate transition-opacity duration-300 ease-out motion-reduce:transition-none",
              collapsed && "opacity-0",
            )}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-3 top-1/2 h-px bg-slate-200 transition-opacity duration-300 ease-out motion-reduce:transition-none",
              collapsed ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}
      <div className={cn("space-y-0.5", label !== null && "pt-0.5")}>
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
    </div>
  );
}

export function SidebarMenuContent({
  collapsed = false,
  dataScope,
  grouped = false,
  items,
  onNavigate,
  userRoles = [],
}: {
  collapsed?: boolean;
  /** The account's scope; decides which section(s) it works in. */
  dataScope?: DataScope;
  /**
   * Lays `items` out in the app's own sections (see `buildMenuSections`)
   * instead of one flat list. A classroom link's own menu (passed as `items`
   * from outside) carries no sections, so it always renders flat.
   */
  grouped?: boolean;
  items: MenuItem[];
  onNavigate?: () => void;
  userRoles?: string[];
}) {
  // Both the expanded sidebar and the icon rail come from this one list, so
  // folding the rail never adds, drops or reorders an entry.
  const sections = grouped
    ? buildMenuSections(items, userRoles, dataScope)
    : [{ key: "flat", label: null, items }];
  const menuRoutes = collectMenuRoutes(
    sections.flatMap((section) => section.items),
  );
  return (
    <div className="flex h-full flex-col bg-white">
      <nav
        className={cn(
          // `scrollbar-gutter` reserves the scrollbar's width up front. Without
          // it, a group with enough children to overflow makes the scrollbar
          // appear mid-expand, which resizes the rail and relays out every row
          // on the frames the accordion is already animating.
          "min-h-0 flex-1 overflow-y-auto px-2 py-4 [scrollbar-gutter:stable]",
          "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
        )}
      >
        <div className="space-y-3">
          {sections.map((section) => (
            <SidebarSection
              collapsed={collapsed}
              items={section.items}
              key={section.key}
              label={section.label}
              menuRoutes={menuRoutes}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
