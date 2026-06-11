import { GraduationCap } from "lucide-react";
import { Sheet, SheetHeader, SidebarContainer } from "../base";
import {
  MENU_ITEMS,
  filterMenuItems,
  getEffectivePermissions,
} from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { SidebarNavItem } from "./SidebarNavItem";
import { UserProfileMenu } from "./UserProfileMenu";

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthSessionStore((state) => state.user);
  const userPermissions = getEffectivePermissions(user?.roles || [], user?.permissions || []);
  const visibleMenuItems = filterMenuItems(MENU_ITEMS, userPermissions);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <GraduationCap className="size-7 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-slate-900">ระบบติดตามนักเรียน</span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">เมนู</div>
        <div className="space-y-1">
          {visibleMenuItems.map((item) => (
            <SidebarNavItem item={item} key={item.id} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
      <UserProfileMenu />
    </div>
  );
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  return (
    <>
      <SidebarContainer className="w-[260px]">
        <SidebarContent />
      </SidebarContainer>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetHeader heading="ระบบติดตามนักเรียน" onClose={() => onMobileOpenChange(false)} />
        <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
      </Sheet>
    </>
  );
}
