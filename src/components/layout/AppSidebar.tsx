import { Sheet, SheetHeader, SidebarContainer } from "../base";
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

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
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
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-2",
          "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "pt-2 pb-4" : "py-4",
        )}
      >
        {/* Collapses to zero height (not just opacity) so the icon rail sits
            right under the header instead of leaving the label's reserved
            space behind. */}
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
    </div>
  );
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  const collapsed = useSidebarUiStore((state) => state.collapsed);

  return (
    <>
      <SidebarContainer
        className={cn(
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-20" : "w-[260px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </SidebarContainer>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetHeader heading="ระบบติดตามนักเรียน" onClose={() => onMobileOpenChange(false)} />
        <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
      </Sheet>
    </>
  );
}
