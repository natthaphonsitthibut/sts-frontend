import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Avatar,
  Sheet,
  SheetHeader,
  SidebarContainer,
} from "../../../components/base";
import {
  AppBrand,
  AppFrame,
  AppHeaderFrame,
  AppNavigationControls,
  SidebarMenuContent,
} from "../../../components/layout/AppFrame";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import { useSidebarUiStore } from "../../../components/layout/sidebar-ui.store";
import { cn } from "../../../lib/utils";
import type { MenuItem } from "../../auth/lib/permissions";
import { useTeacherLink } from "../hooks/useTeacherLink";

interface TeacherLinkShellProps {
  children: ReactNode;
  /** Page-level actions beside the title, like PageToolbar's `actions`. */
  actions?: ReactNode;
  /** Trail before the current page; the title is always the last crumb. */
  breadcrumb?: Array<{ label: string; to: string; icon?: LucideIcon }>;
  /** Icon beside the page title, matching the authenticated pages. */
  icon?: LucideIcon;
  title?: ReactNode;
  subtitle?: ReactNode;
  centered?: boolean;
  contentClassName?: string;
}

/**
 * A teacher link reaches exactly one place — their own classrooms; everything
 * else (roster, attendance, history) is opened from a classroom, so the rail
 * carries a single destination.
 */
const TEACHER_MENU_ITEMS: MenuItem[] = [
  {
    id: "my-classrooms",
    label: "ห้องเรียนของฉัน",
    iconName: "school-building",
    route: "/teacher-access",
    activeRoutes: ["/teacher-access"],
  },
  {
    id: "my-timetable",
    label: "ตารางสอนของฉัน",
    iconName: "calendar",
    route: "/teacher-access/timetable",
    activeRoutes: ["/teacher-access/timetable"],
  },
];

/**
 * A link's home is its own landing page — `/` needs an account. The crumb
 * carries that page's real name so it matches the title and the rail item,
 * the same way "หน้าหลัก" does inside the authenticated app.
 */
const TEACHER_HOME_CRUMB = [
  {
    label: "ห้องเรียนของฉัน",
    to: "/teacher-access",
    icon: PAGE_ICONS["school-building"],
  },
];

function TeacherSidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <SidebarMenuContent
      collapsed={collapsed}
      items={TEACHER_MENU_ITEMS}
      onNavigate={onNavigate}
    />
  );
}

/**
 * Frame for every teacher-link page. It reuses the app's own header/sidebar
 * primitives so a link looks like the system it belongs to — the difference is
 * what is inside: no permission-driven menu, no notifications, no profile
 * actions, because a link holder has no account.
 */
export function TeacherLinkShell({
  actions,
  breadcrumb,
  centered = false,
  children,
  contentClassName,
  icon,
  subtitle,
  title,
}: TeacherLinkShellProps) {
  const { context } = useTeacherLink();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const collapsed = useSidebarUiStore((state) => state.collapsed);

  return (
    <AppFrame
      header={
        <AppHeaderFrame>
          <AppNavigationControls onMobileMenuClick={() => setMobileSidebarOpen(true)} />
          <AppBrand />
          <Avatar
            aria-label={`เข้าใช้งานในชื่อ ${context.teacherDisplayName}`}
            className="size-10"
            gradientName={context.teacherDisplayName}
          />
        </AppHeaderFrame>
      }
      sidebar={
        <>
          <SidebarContainer
            className={cn(
              "transition-[width] duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "w-20" : "w-[260px]",
            )}
          >
            <TeacherSidebarContent collapsed={collapsed} />
          </SidebarContainer>
          <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
            <SheetHeader heading="ระบบติดตามนักเรียน" onClose={() => setMobileSidebarOpen(false)} />
            <TeacherSidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
          </Sheet>
        </>
      }
    >
      <PageShell
        className={cn(centered && "flex items-center")}
        contentClassName={cn(centered && "flex min-h-full items-center justify-center", contentClassName)}
      >
        <div className="w-full">
          {title ? (
            <PageToolbar
              actions={actions}
              breadcrumbTrail={breadcrumb?.length ? breadcrumb : TEACHER_HOME_CRUMB}
              icon={icon}
              title={title}
            />
          ) : null}
          {subtitle ? (
            <p className="-mt-2 mb-4 text-sm text-content-secondary">{subtitle}</p>
          ) : null}
          {children}
        </div>
      </PageShell>
    </AppFrame>
  );
}
