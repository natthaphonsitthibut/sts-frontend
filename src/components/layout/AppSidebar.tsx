import { Sheet, SheetHeader } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
  type MenuItem,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { AppBrand, SidebarMenuContent } from "./AppFrame";
import { CollapsibleDesktopSidebar } from "./CollapsibleDesktopSidebar";

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /**
   * The rail's entries. Omitted inside the app, where the menu is derived from
   * the signed-in account's permissions. A classroom link passes its own —
   * its holder has no account to derive anything from — and gets this exact
   * sidebar rather than a second one that only looks like it.
   */
  items?: MenuItem[];
  /** Where the mobile sheet's brand leads; the app's own home by default. */
  brandTo?: string | null;
}

interface SidebarContentProps {
  collapsed?: boolean;
  items?: MenuItem[];
  onNavigate?: () => void;
}

function SidebarContent({
  collapsed = false,
  items,
  onNavigate,
}: SidebarContentProps) {
  const user = useAuthSessionStore((state) => state.user);
  const userPermissions = getEffectivePermissions(
    user?.roles || [],
    user?.permissions || [],
  );
  const filteredMenuItems = filterMenuItems(
    MENU_ITEMS,
    userPermissions,
    user?.data_scope,
    user?.roles || [],
  );
  return (
    <SidebarMenuContent
      collapsed={collapsed}
      items={items ?? filteredMenuItems}
      onNavigate={onNavigate}
    />
  );
}

export function AppSidebar({
  brandTo,
  items,
  mobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  return (
    <>
      <CollapsibleDesktopSidebar>
        {(collapsed) => <SidebarContent collapsed={collapsed} items={items} />}
      </CollapsibleDesktopSidebar>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetHeader
          heading={
            <AppBrand
              className="gap-2 pr-2 [&>span]:text-lg"
              onClick={() => onMobileOpenChange(false)}
              {...(brandTo === undefined ? {} : { to: brandTo })}
            />
          }
          onClose={() => onMobileOpenChange(false)}
        />
        <SidebarContent
          items={items}
          onNavigate={() => onMobileOpenChange(false)}
        />
      </Sheet>
    </>
  );
}
