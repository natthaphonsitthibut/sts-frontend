import { useMemo, useState, type ReactNode } from "react";
import {
  AppBrand,
  AppFrame,
  AppHeaderFrame,
  AppNavigationControls,
} from "../../../components/layout/AppFrame";
import { AppSidebar } from "../../../components/layout/AppSidebar";
import { HeaderProfileMenu } from "../../../components/layout/HeaderProfileMenu";
import { PageShell } from "../../../components/layout/page-primitives";
import type { MenuItem } from "../../auth/lib/permissions";
import type { CheckInContext } from "../types/check-in.types";

const LINK_HOME = "/classroom";

function classroomLinkMenu(
  classrooms: CheckInContext["classrooms"],
): MenuItem[] {
  return [
    {
      id: "my-classrooms",
      label: "ห้องเรียนของฉัน",
      iconName: "school-building",
      route: LINK_HOME,
      activeRoutes: [LINK_HOME],
      // One entry per card on the page itself, pointing at the same lesson —
      // the rail is a shortcut into the list, not a second list with rules of
      // its own. Two offerings in one room share a room label, so the subject
      // is what tells them apart, exactly as the cards do.
      children: classrooms.map((classroom) => ({
        id: `${classroom.id}:${classroom.classroomSubjectId}`,
        label: classroom.subjectNames
          ? `${classroom.gradeLabel}/${classroom.roomCode} · ${classroom.subjectNames}`
          : `${classroom.gradeLabel}/${classroom.roomCode}`,
        iconName: "school-building",
        route: `${LINK_HOME}/check-in/${classroom.id}/${classroom.classroomSubjectId}`,
      })),
    },
  ];
}

/**
 * The signed-in half of a classroom link, wearing the app's own frame.
 *
 * A link holder has no account, so the rail carries the rooms the link reaches
 * instead of a permission-driven menu — but it is literally `AppSidebar`, given
 * different entries, not a copy that behaves almost like it. The header is the
 * app's own frame minus the notification bell, which needs an account. The
 * pre-authentication screens keep `GuestPageShell`: there is nothing to
 * navigate to until the link is opened.
 */
export function ClassroomLinkShell({
  children,
  classrooms,
  displayName,
  photoUrl,
  schoolName,
}: {
  children: ReactNode;
  classrooms: CheckInContext["classrooms"];
  displayName: string | null;
  photoUrl: string | null;
  schoolName: string | null;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // The page around this shell re-renders on every poll and query settle. A
  // fresh menu array each time re-runs the rail's route collection and re-renders
  // every row — work landing in the middle of the 300ms collapse.
  const items = useMemo(() => classroomLinkMenu(classrooms), [classrooms]);

  return (
    <AppFrame
      header={
        <AppHeaderFrame>
          <AppNavigationControls
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
          />
          <AppBrand className="flex-1" to={LINK_HOME} />
          <HeaderProfileMenu
            affiliation={schoolName}
            canEditProfile={false}
            canSignOut={false}
            displayName={displayName ?? "คุณครู"}
            photoUrl={photoUrl}
            roleLabel="คุณครู"
          />
        </AppHeaderFrame>
      }
      sidebar={
        <AppSidebar
          brandTo={LINK_HOME}
          items={items}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
      }
    >
      <PageShell>{children}</PageShell>
    </AppFrame>
  );
}
