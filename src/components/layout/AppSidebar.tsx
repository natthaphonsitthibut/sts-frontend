import { Menu } from "lucide-react";
import { IconButton, Sheet, SheetHeader, SidebarContainer } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
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
  const visibleMenuItems = filterMenuItems(MENU_ITEMS, userPermissions);

  return (
    <div className="flex h-full flex-col bg-white">
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <div
          className={cn(
            "mb-2 flex min-h-9 items-center gap-2 px-3",
            collapsed && "justify-center px-0",
          )}
        >
          <div
            className={cn(
              "flex-1 text-xs font-bold uppercase tracking-wide text-slate-400",
              collapsed && "sr-only",
            )}
          >
            เมนู
          </div>
          {onToggleCollapsed ? (
            <IconButton
              aria-expanded={!collapsed}
              aria-label={collapsed ? "ขยายเมนูด้านข้าง" : "พับเมนูด้านข้าง"}
              className={cn(
                "border-transparent bg-transparent shadow-none hover:bg-slate-100",
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
