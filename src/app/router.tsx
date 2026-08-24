import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { AraIdDocumentBrand } from "../features/araid/components/AraIdDocumentBrand";
import {
  AdminAccessPage,
  AraIdSplashPage,
  AraIdLoginPage,
  AraIdPinPage,
  AraIdHomePage,
  AraIdDocumentsPage,
  AraIdSettingsPage,
  AraIdManagePage,
  AraIdAuthorizePage,
  AuditLogDetailPage,
  AttendanceCheckInPage,
  PublicCheckInPage,
  TeacherLineInvitationPage,
  TeacherLineLinkPage,
  TeacherLineAraIdChallengePage,
  TeacherLineAraIdAuthorizePage,
  TeacherLineLinkResultPage,
  AttendanceOperationsPage,
  CompletedPage,
  CurriculumGradesPage,
  CurriculumSubjectFormPage,
  CurriculumSubjectsPage,
  ClassroomsPage,
  ClassroomLinksPage,
  ClassroomDetailPage,
  CaseDetailPage,
  CaseReviewDetailPage,
  ChangePasswordPage,
  DataExportsPage,
  DashboardPage,
  ExpiredPage,
  ForbiddenPage,
  ImportDataPage,
  ImportQuarantineDetailPage,
  LockedPage,
  MainPage,
  ManageRoleGroupFormPage,
  ManageRoleGroupsPage,
  ManageUserFormPage,
  ManageUsersPage,
  MasterDataPage,
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  ReportPage,
  RouteSuspense,
  SchoolStructurePage,
  StudentDetailPage,
  StudentEditPage,
  StudentListPage,
  StudentStatusesPage,
  SuccessPage,
  SystemSettingsPage,
  TaskDetailPage,
  TaskGuestPage,
  TeacherFormPage,
  TeacherCommentReportsPage,
  TeachersPage,
  UserDetailPage,
} from "./lazy-pages";
import {
  AttendanceDefaultRedirect,
  ClassroomDefaultRedirect,
  LegacyCasesRedirect,
  LegacyRouteRedirect,
  LegacyTaskDetailRedirect,
} from "./route-redirects";

function withSuspense(children: ReactNode): ReactNode {
  return <RouteSuspense>{children}</RouteSuspense>;
}

function protectedElement(
  children: ReactNode,
  permission?: string | string[],
  options?: { requireGlobalScope?: boolean; role?: string | string[] },
): ReactNode {
  return (
    <ProtectedRoute
      permission={permission}
      requireGlobalScope={options?.requireGlobalScope}
      role={options?.role}
    >
      {withSuspense(children)}
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: protectedElement(<MainPage />, "home"),
      },
      {
        path: "student-risk-report",
        element: <LegacyRouteRedirect to="/student-risk-report/risk" />,
      },
      {
        path: "student-risk-report/risk",
        element: protectedElement(<DashboardPage />, "dashboard"),
      },
      {
        path: "student-risk-report/watchlist",
        element: protectedElement(<DashboardPage />, "dashboard"),
      },
      {
        path: "student-risk-report/teacher-comments",
        element: protectedElement(<TeacherCommentReportsPage />, "students"),
      },
      {
        // The ข้อสังเกต/คำขอเยี่ยมบ้าน screens were retired; keep old links working.
        path: "student-risk-report/teacher-reports",
        element: (
          <LegacyRouteRedirect to="/student-risk-report/teacher-comments" />
        ),
      },
      {
        path: "student-risk-report/home-visit-requests",
        element: <LegacyRouteRedirect to="/student-risk-report" />,
      },
      {
        path: "dashboard",
        element: <LegacyRouteRedirect to="/student-risk-report" />,
      },
      {
        path: "change-password",
        element: withSuspense(<ChangePasswordPage />),
      },
      {
        path: "profile",
        element: protectedElement(<ProfilePage />),
      },
      {
        // Kept as a redirect: the permissions tab folded into /profile itself.
        path: "profile/permissions",
        element: <LegacyRouteRedirect to="/profile" />,
      },
      {
        path: "notifications",
        element: protectedElement(<NotificationsPage />),
      },
      {
        path: "students",
        element: protectedElement(<StudentListPage />, "students"),
      },
      {
        path: "students/history",
        element: protectedElement(<StudentListPage />, "students"),
      },
      {
        path: "students/export",
        element: protectedElement(<StudentListPage />, "students"),
      },
      {
        path: "students/:id",
        element: protectedElement(<StudentDetailPage />, "students"),
      },
      {
        path: "students/:id/edit",
        element: protectedElement(<StudentEditPage />, "students"),
      },
      {
        path: "attendance",
        element: protectedElement(<AttendanceDefaultRedirect />, "attendance"),
      },
      {
        path: "attendance/roster",
        element: <LegacyRouteRedirect to="/attendance/check-in" />,
      },
      {
        path: "attendance/check-in",
        element: protectedElement(<AttendanceCheckInPage />, "attendance"),
      },
      {
        path: "attendance/history",
        element: <LegacyRouteRedirect to="/attendance/check-in" />,
      },
      {
        path: "attendance/history/attendance",
        element: <LegacyRouteRedirect to="/attendance/check-in" />,
      },
      {
        path: "attendance/history/imports",
        element: <LegacyRouteRedirect to="/attendance/check-in" />,
      },
      {
        path: "attendance/history/delegations",
        element: <LegacyRouteRedirect to="/attendance/check-in" />,
      },
      {
        path: "cases",
        element: <LegacyCasesRedirect />,
      },
      {
        path: "cases/risk",
        element: <LegacyCasesRedirect />,
      },
      {
        path: "cases/watchlist",
        element: <LegacyCasesRedirect />,
      },
      {
        path: "cases/history",
        element: <LegacyCasesRedirect />,
      },
      {
        path: "cases/:caseId",
        element: protectedElement(<CaseDetailPage />, "dashboard"),
      },
      {
        path: "cases/:caseId/reviews/:reviewId",
        element: protectedElement(<CaseReviewDetailPage />, "dashboard"),
      },
      {
        path: "attendance-links",
        element: <LegacyRouteRedirect to="/attendance/classroom-links" />,
      },
      {
        path: "attendance/classroom-links",
        element: protectedElement(
          <ClassroomLinksPage />,
          "manage-classroom-links",
        ),
      },
      {
        path: "attendance-operations",
        element: protectedElement(
          <AttendanceOperationsPage />,
          "attendance-dashboard",
        ),
      },
      {
        path: "timetable",
        element: <LegacyRouteRedirect to="/curriculum" />,
      },
      {
        path: "timetable/mine",
        element: <LegacyRouteRedirect to="/curriculum" />,
      },
      {
        path: "timetable/rooms",
        element: <LegacyRouteRedirect to="/curriculum" />,
      },
      {
        path: "classrooms",
        element: protectedElement(<ClassroomsPage />, "classrooms"),
      },
      {
        path: "classrooms/:classroomId",
        element: protectedElement(<ClassroomDefaultRedirect />, "classrooms"),
      },
      {
        path: "classrooms/:classroomId/roster",
        element: protectedElement(<ClassroomDetailPage />, "classrooms"),
      },
      {
        path: "classrooms/:classroomId/history",
        element: protectedElement(<ClassroomDetailPage />, "classrooms"),
      },
      {
        path: "school-structure",
        element: protectedElement(
          <SchoolStructurePage />,
          "manage-school-structure",
        ),
      },
      {
        path: "import-data",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "data-exports",
        element: protectedElement(<DataExportsPage />, "export-data"),
      },
      {
        path: "data-exports/history",
        element: protectedElement(<DataExportsPage />, "export-data"),
      },
      {
        path: "import-data/quarantine",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "import-data/history",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "import-data/quarantine/:id",
        element: protectedElement(
          <ImportQuarantineDetailPage />,
          "import-data",
        ),
      },
      {
        path: "manage-users",
        element: protectedElement(<ManageUsersPage />, "manage-users-list"),
      },
      {
        path: "manage-users/:id",
        element: protectedElement(<UserDetailPage />, "manage-users-list"),
      },
      {
        path: "manage-users/:id/permissions",
        element: protectedElement(<UserDetailPage />, "manage-users-list"),
      },
      {
        path: "manage-users/new",
        element: protectedElement(<ManageUserFormPage />, "manage-users-list"),
      },
      {
        path: "manage-users/:id/edit",
        element: protectedElement(<ManageUserFormPage />, "manage-users-list"),
      },
      {
        path: "manage-users/:id/edit/permissions",
        element: protectedElement(<ManageUserFormPage />, "manage-users-list"),
      },
      {
        path: "curriculum",
        element: protectedElement(<CurriculumGradesPage />, "manage-subjects"),
      },
      {
        path: "curriculum/:gradeLevelId",
        element: protectedElement(
          <CurriculumSubjectsPage />,
          "manage-subjects",
        ),
      },
      {
        path: "curriculum/:gradeLevelId/subjects/new",
        element: protectedElement(
          <CurriculumSubjectFormPage />,
          "manage-subjects",
        ),
      },
      {
        path: "curriculum/:gradeLevelId/subjects/:subjectId/edit",
        element: protectedElement(
          <CurriculumSubjectFormPage />,
          "manage-subjects",
        ),
      },
      {
        path: "subjects",
        element: <LegacyRouteRedirect to="/curriculum" />,
      },
      {
        path: "manage-teachers",
        element: protectedElement(<TeachersPage />, "manage-teachers"),
      },
      {
        path: "manage-teachers/new",
        element: protectedElement(<TeacherFormPage />, "manage-teachers"),
      },
      {
        path: "manage-teachers/:id/edit",
        element: protectedElement(<TeacherFormPage />, "manage-teachers"),
      },
      {
        path: "manage-role-groups",
        element: protectedElement(
          <ManageRoleGroupsPage />,
          "manage-role-groups",
        ),
      },
      {
        path: "manage-role-groups/new",
        element: protectedElement(
          <ManageRoleGroupFormPage />,
          "manage-role-groups",
        ),
      },
      {
        path: "manage-role-groups/:name/edit",
        element: protectedElement(
          <ManageRoleGroupFormPage />,
          "manage-role-groups",
        ),
      },
      {
        path: "audit-log/:id",
        element: protectedElement(<AuditLogDetailPage />, "audit-log"),
      },
      {
        path: "settings",
        element: protectedElement(<SystemSettingsPage />, "settings"),
      },
      {
        path: "settings/student-statuses",
        element: <LegacyRouteRedirect to="/master-data/student-statuses" />,
      },
      {
        path: "master-data",
        element: protectedElement(<MasterDataPage />, "master-data", {
          requireGlobalScope: true,
          role: "ADMIN",
        }),
      },
      {
        path: "master-data/student-statuses",
        element: protectedElement(<StudentStatusesPage />, "master-data", {
          requireGlobalScope: true,
          role: "ADMIN",
        }),
      },
      {
        path: "tasks/:taskId",
        // A task link belongs to a case and is opened from one, and the page
        // embeds บันทึกการใช้งาน — `home`, which every account holds, would have
        // made that panel world-readable.
        element: protectedElement(<TaskDetailPage />, "dashboard"),
      },
      {
        path: "task-detail/:taskId",
        element: <LegacyTaskDetailRedirect />,
      },
    ],
  },
  {
    path: "/task/:token",
    element: withSuspense(<TaskGuestPage />),
  },
  {
    path: "/task/:token/report",
    element: withSuspense(<ReportPage />),
  },
  {
    path: "/task/:token/success",
    element: withSuspense(<SuccessPage />),
  },
  {
    path: "/task/:token/completed",
    element: withSuspense(<CompletedPage />),
  },
  {
    path: "/task/:token/expired",
    element: withSuspense(<ExpiredPage />),
  },
  {
    path: "/task/:token/locked",
    element: withSuspense(<LockedPage />),
  },
  // Public: a teacher attaching their LINE account proves who they are with an
  // emailed code, so the URL itself carries no secret and can live in the
  // official account's rich menu.
  {
    path: "/line-link",
    element: withSuspense(<TeacherLineLinkPage />),
  },
  {
    path: "/line-link/araid-authorize",
    element: withSuspense(<TeacherLineAraIdAuthorizePage />),
  },
  {
    path: "/line-link/araid",
    element: withSuspense(<TeacherLineAraIdChallengePage />),
  },
  {
    path: "/line-link/invite",
    element: withSuspense(<TeacherLineInvitationPage />),
  },
  {
    path: "/line-link/result",
    element: withSuspense(<TeacherLineLinkResultPage />),
  },
  {
    path: "/check-in",
    element: withSuspense(<PublicCheckInPage />),
  },
  {
    path: "/teacher-access/*",
    element: <LegacyRouteRedirect to="/check-in" />,
  },
  {
    path: "/araid",
    element: <AraIdDocumentBrand />,
    children: [
      {
        index: true,
        element: withSuspense(<AraIdSplashPage />),
      },
      {
        path: "login",
        element: withSuspense(<AraIdLoginPage />),
      },
      {
        path: "pin",
        element: withSuspense(<AraIdPinPage />),
      },
      {
        path: "home",
        element: withSuspense(<AraIdHomePage />),
      },
      {
        path: "documents",
        element: withSuspense(<AraIdDocumentsPage />),
      },
      {
        path: "settings",
        element: withSuspense(<AraIdSettingsPage />),
      },
      {
        path: "manage",
        element: (
          <ProtectedRoute role="ADMIN">
            {withSuspense(<AraIdManagePage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "authorize",
        element: withSuspense(<AraIdAuthorizePage />),
      },
    ],
  },
  {
    path: "/login",
    element: withSuspense(<AdminAccessPage />),
  },
  {
    path: "/admin-access",
    element: <LegacyRouteRedirect to="/login" />,
  },
  {
    path: "/forbidden",
    element: withSuspense(<ForbiddenPage />),
  },
  {
    path: "*",
    element: withSuspense(<NotFoundPage />),
  },
]);
