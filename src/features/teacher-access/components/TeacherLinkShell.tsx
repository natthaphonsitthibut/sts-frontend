import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetHeader } from "../../../components/base";
import {
  AppBrand,
  AppFrame,
  AppHeaderFrame,
  AppNavigationControls,
  SidebarMenuContent,
} from "../../../components/layout/AppFrame";
import {
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import { CollapsibleDesktopSidebar } from "../../../components/layout/CollapsibleDesktopSidebar";
import { HeaderProfileMenu } from "../../../components/layout/HeaderProfileMenu";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { cn } from "../../../lib/utils";
import { useTeacherLink } from "../hooks/useTeacherLink";
import { useTeacherOwnPhoto } from "../hooks/useTeacherAccess";

interface TeacherLinkShellProps {
  children: ReactNode;
  /** Page-level actions beside the title, like PageToolbar's `actions`. */
  actions?: ReactNode;
  /** Navigation buttons beside the breadcrumbs, like PageToolbar's `navigation`. */
  navigation?: ReactNode;
  /** Trail before the current page; the title is always the last crumb. */
  breadcrumb?: Array<{ label: string; to: string; icon?: LucideIcon }>;
  /** Crumb text for this page when the title says more than its name. */
  breadcrumbTitle?: string;
  /** Icon beside the page title, matching the authenticated pages. */
  icon?: LucideIcon;
  title?: ReactNode;
  subtitle?: ReactNode;
  centered?: boolean;
  contentClassName?: string;
}

const TEACHER_MENU_ITEMS = [
  {
    id: "my-classrooms",
    label: "ห้องเรียนของฉัน",
    iconName: "school-building" as const,
    route: "/teacher-access",
    activeRoutes: ["/teacher-access"],
  },
  {
    id: "my-timetable",
    label: "ตารางสอนของฉัน",
    iconName: "calendar" as const,
    route: "/teacher-access/timetable",
    activeRoutes: ["/teacher-access/timetable"],
  },
];

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
 * Guest shell for a teacher who arrived via a magic access grant link. Shares
 * layout primitives with the authenticated product so a link looks like the
 * system it belongs to — the difference is what is inside: no
 * permission-driven menu, no notifications, no profile actions, because a link
 * holder has no account.
 */
export function TeacherLinkShell({
  actions,
  navigation,
  breadcrumb,
  breadcrumbTitle,
  centered = false,
  children,
  contentClassName,
  icon,
  subtitle,
  title,
}: TeacherLinkShellProps) {
  const { context } = useTeacherLink();
  const ownPhoto = useTeacherOwnPhoto(context.teacherHasPhoto);
  const ownPhotoUrl = useBlobObjectUrl(ownPhoto.data);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const attendanceOnly = context.accessScope === "ATTENDANCE_ONLY";
  const homeRoute =
    attendanceOnly && context.assignments[0]
      ? `/teacher-access/attendance/${context.assignments[0].id}/check-in`
      : "/teacher-access";

  return (
    <AppFrame
      header={
        <AppHeaderFrame>
          <AppNavigationControls
            onMobileMenuClick={() => {
              if (!attendanceOnly) setMobileSidebarOpen(true);
            }}
          />
          <AppBrand className="flex-1" to={homeRoute} />
          <HeaderProfileMenu
            affiliation={context.schoolName}
            canEditProfile={false}
            canSignOut={false}
            displayName={context.teacherDisplayName}
            photoUrl={ownPhotoUrl}
            roleLabel="คุณครู"
          />
        </AppHeaderFrame>
      }
      sidebar={
        attendanceOnly ? undefined : (
          <>
            <CollapsibleDesktopSidebar>
              {(collapsed) => <TeacherSidebarContent collapsed={collapsed} />}
            </CollapsibleDesktopSidebar>
            <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
              <SheetHeader
                heading={
                  <AppBrand
                    className="max-w-52"
                    onClick={() => setMobileSidebarOpen(false)}
                    to="/teacher-access"
                  />
                }
                onClose={() => setMobileSidebarOpen(false)}
              />
              <TeacherSidebarContent
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </Sheet>
          </>
        )
      }
    >
      <PageShell
        className={cn(centered && "flex items-center")}
        contentClassName={cn(
          centered && "flex min-h-full items-center justify-center",
          contentClassName,
        )}
      >
        <div className="w-full">
          {title ? (
            <PageToolbar
              actions={actions}
              breadcrumbTitle={breadcrumbTitle}
              hideBreadcrumb={attendanceOnly}
              navigation={navigation}
              breadcrumbTrail={
                attendanceOnly
                  ? []
                  : breadcrumb?.length
                    ? breadcrumb
                    : TEACHER_HOME_CRUMB
              }
              icon={icon}
              title={title}
            />
          ) : null}
          {subtitle ? (
            <p className="-mt-2 mb-4 text-sm text-content-secondary">
              {subtitle}
            </p>
          ) : null}
          {children}
        </div>
      </PageShell>
    </AppFrame>
  );
}
