import { useState } from "react";
import { Sheet, SheetHeader, SidebarContainer } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
  isStudentSelfSession,
  type MenuItem,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { cn } from "../../lib/utils";
import { AppBrand, SidebarMenuContent } from "./AppFrame";
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
    isStudentSelfSession(user) &&
    userPermissions.length === 1 &&
    userPermissions[0] === "student-self";
  const visibleMenuItems: MenuItem[] = usesDefaultStudentNavigation
    ? filteredMenuItems.flatMap((item) => {
        if (item.id === "student-self") return [item];
        const timetable = item.children?.find((child) => child.id === "timetable");
        return timetable ? [{ ...timetable, label: "ตารางเรียน" }] : [];
      })
    : filteredMenuItems;

  return <SidebarMenuContent collapsed={collapsed} items={visibleMenuItems} onNavigate={onNavigate} />;
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  const collapsed = useSidebarUiStore((state) => state.collapsed);
  const [hovered, setHovered] = useState(false);
  const visuallyCollapsed = collapsed && !hovered;

  return (
    <>
      <div
        className={cn(
          "hidden h-full shrink-0 transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block",
          visuallyCollapsed ? "w-20" : "w-[260px]",
        )}
      >
        <SidebarContainer
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "h-full overflow-x-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none",
            visuallyCollapsed ? "w-20" : "w-[260px]",
          )}
        >
          <SidebarContent collapsed={visuallyCollapsed} />
        </SidebarContainer>
      </div>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetHeader
          heading={
            <AppBrand
              className="max-w-52"
              onClick={() => onMobileOpenChange(false)}
            />
          }
          onClose={() => onMobileOpenChange(false)}
        />
        <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
      </Sheet>
    </>
  );
}
