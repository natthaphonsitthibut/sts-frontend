import { Sheet, SheetHeader } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { AppBrand, SidebarMenuContent } from "./AppFrame";
import { CollapsibleDesktopSidebar } from "./CollapsibleDesktopSidebar";

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
  return <SidebarMenuContent collapsed={collapsed} items={filteredMenuItems} onNavigate={onNavigate} />;
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  return (
    <>
      <CollapsibleDesktopSidebar>
        {(collapsed) => <SidebarContent collapsed={collapsed} />}
      </CollapsibleDesktopSidebar>
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
