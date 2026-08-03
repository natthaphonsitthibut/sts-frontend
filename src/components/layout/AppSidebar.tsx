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
import { SidebarMenuContent } from "./AppFrame";
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
