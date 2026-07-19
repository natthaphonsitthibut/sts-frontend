import { Menu } from "lucide-react";
import { IconButton, Sheet, SheetHeader, SidebarContainer } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
  isStudentOnlyRole,
  type MenuItem,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { cn } from "../../lib/utils";
import { SidebarNavItem } from "./SidebarNavItem";
import { useSidebarUiStore } from "./sidebar-ui.store";
import { UserProfileMenu } from "./UserProfileMenu";

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapsed,
}: SidebarContentProps) {
  const user = useAuthSessionStore((state) => state.user);
  const userPermissions = getEffectivePermissions(user?.roles || [], user?.permissions || []);
  const filteredMenuItems = filterMenuItems(MENU_ITEMS, userPermissions);
  const usesDefaultStudentNavigation =
    isStudentOnlyRole(user?.roles || []) &&
    userPermissions.length === 1 &&
    userPermissions[0] === "student-self";
  const visibleMenuItems: MenuItem[] = usesDefaultStudentNavigation
    ? filteredMenuItems.flatMap((item) => {
        if (item.id === "student-self") return [item];
        const timetable = item.children?.find((child) => child.id === "timetable");
        return timetable ? [{ ...timetable, label: "ตารางเรียน" }] : [];
      })
    : filteredMenuItems;

  return (
    <div className="flex h-full flex-col bg-white">
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        {/* justify-center stays on in both states (a no-op while the flex-1
            label fills the row) so the toggle button glides to the middle as
            the label squeezes, instead of snapping when layout classes flip. */}
        <div className="mb-2 flex min-h-9 items-center justify-center gap-2 px-3">
          {/* Fades/squeezes with the width transition (same treatment as the
              nav-item labels in SidebarNavItem) instead of snapping away;
              `-ml-2` cancels the row's `gap-2` when fully collapsed. */}
          <div
            className={cn(
              "min-w-0 flex-1 truncate text-xs font-semibold text-slate-500",
              "transition-[opacity,max-width,margin] duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "-ml-2 max-w-0 opacity-0" : "max-w-48 opacity-100",
            )}
          >
            เมนู
          </div>
          {onToggleCollapsed ? (
            <IconButton
              aria-expanded={!collapsed}
              aria-label={collapsed ? "ขยายเมนูด้านข้าง" : "พับเมนูด้านข้าง"}
              className={cn(
                "border-slate-300 bg-white shadow-none",
                collapsed && "text-slate-600",
              )}
              icon={Menu}
              onClick={onToggleCollapsed}
              size="sm"
              title={collapsed ? "ขยายเมนู" : "พับเมนู"}
              variant="ghost"
            />
          ) : null}
        </div>
        <div className="space-y-0.5">
          {visibleMenuItems.map((item) => (
            <SidebarNavItem
              collapsed={collapsed}
              item={item}
              key={item.id}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
      <UserProfileMenu collapsed={collapsed} />
    </div>
  );
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  const collapsed = useSidebarUiStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarUiStore((state) => state.toggleCollapsed);

  return (
    <>
      <SidebarContainer
        className={cn(
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-20" : "w-[260px]",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </SidebarContainer>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetHeader heading="ระบบติดตามนักเรียน" onClose={() => onMobileOpenChange(false)} />
        <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
      </Sheet>
    </>
  );
}
