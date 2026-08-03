import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
import { PageShell } from "../../../components/layout/page-primitives";
import { useSidebarUiStore } from "../../../components/layout/sidebar-ui.store";
import { getNameInitials } from "../../../lib/person-name";
import { cn } from "../../../lib/utils";
import type { MenuItem } from "../../auth/lib/permissions";
import { useTeacherLink } from "../hooks/useTeacherLink";

interface TeacherLinkShellProps {
  children: ReactNode;
  /** Trail before the current page; the title is always the last crumb. */
  breadcrumb?: Array<{ label: string; to: string }>;
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
  breadcrumb,
  centered = false,
  children,
  contentClassName,
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
            className="size-10 bg-brand-soft font-semibold text-primary"
            fallback={getNameInitials(context.teacherDisplayName)}
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
          {breadcrumb?.length ? (
            <nav
              aria-label="เส้นทางนำทาง"
              className="mb-2 flex min-h-6 items-center text-sm font-medium text-breadcrumb-muted"
            >
              {breadcrumb.map((crumb) => (
                <span className="flex min-w-0 items-center" key={crumb.to}>
                  <Link
                    className="truncate rounded-sm transition-colors outline-none hover:text-content-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    to={crumb.to}
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRight aria-hidden="true" className="mx-2 size-4 shrink-0 opacity-60" />
                </span>
              ))}
              <span aria-current="page" className="truncate font-semibold text-content-primary">
                {title}
              </span>
            </nav>
          ) : null}

          {title ? (
            <h1 className="text-xl font-semibold leading-8 text-content-primary">{title}</h1>
          ) : null}
          {subtitle ? <p className="mt-1 text-sm text-content-secondary">{subtitle}</p> : null}
          <div className={title ? "mt-6" : undefined}>{children}</div>
        </div>
      </PageShell>
    </AppFrame>
  );
}
