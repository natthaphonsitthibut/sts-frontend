import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import {
  AdminAccessPage,
  AuditLogDetailPage,
  AttendanceCheckInPage,
  AttendanceLinkDetailPage,
  AttendanceLinksDashboardPage,
  AttendanceOperationsPage,
  AttendanceRecordPage,
  CasesListPage,
  ChangePasswordPage,
  CreateTaskPage,
  DataExportsPage,
  DashboardPage,
  DelegatePage,
  ExpiredPage,
  FieldFollowerApplicationPage,
  FieldFollowerDetailPage,
  FieldFollowersReviewPage,
  FieldMonitorMapPage,
  ForbiddenPage,
  ImportDataPage,
  ImportQuarantineDetailPage,
  LockedPage,
  LoginLinkDetailPage,
  LoginLinksPage,
  MagicLoginPage,
  MainPage,
  MasterDataLookupsPage,
  ManageRoleGroupFormPage,
  ManageRoleGroupsPage,
  ManageUserFormPage,
  ManageUsersPage,
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  ReportPage,
  RouteSuspense,
  StudentDetailPage,
  StudentEditPage,
  StudentAccountsPage,
  StudentListPage,
  StudentSelfPage,
  StudentStatusesPage,
  SuccessPage,
  SystemSettingsPage,
  TaskDetailPage,
  TaskGuestPage,
  TimetablePage,
  UserDetailPage,
  VisitLinksPage,
  WorkSessionMonitorPage,
} from "./lazy-pages";
import {
  LegacyRouteRedirect,
  LegacyTaskDetailRedirect,
} from "./route-redirects";

function withSuspense(children: ReactNode): ReactNode {
  return <RouteSuspense>{children}</RouteSuspense>;
}

function protectedElement(children: ReactNode, permission?: string): ReactNode {
  return (
    <ProtectedRoute permission={permission}>
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
        element: protectedElement(<DashboardPage />, "dashboard"),
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
        path: "profile/permissions",
        element: protectedElement(<ProfilePage />),
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
        element: protectedElement(<StudentEditPage />, "edit-students"),
      },
      {
        path: "my-attendance",
        element: protectedElement(<StudentSelfPage />, "student-self"),
      },
      {
        path: "create",
        element: protectedElement(<CreateTaskPage />, "create"),
      },
      {
        path: "create/:type",
        element: protectedElement(<CreateTaskPage />, "create"),
      },
      {
        path: "attendance",
        element: protectedElement(<AttendanceCheckInPage />, "attendance"),
      },
      {
        path: "attendance/history",
        element: protectedElement(<AttendanceCheckInPage />, "attendance"),
      },
      {
        path: "attendance/record/:classId",
        element: protectedElement(<AttendanceRecordPage />, "attendance"),
      },
      {
        path: "cases",
        element: protectedElement(<CasesListPage />, "review-cases"),
      },
      {
        path: "cases/history",
        element: protectedElement(<CasesListPage />, "review-cases"),
      },
      {
        path: "visit-links",
        element: protectedElement(<VisitLinksPage />, "review-cases"),
      },
      {
        path: "visit-links/history",
        element: protectedElement(<VisitLinksPage />, "review-cases"),
      },
      {
        path: "attendance-links",
        element: protectedElement(
          <AttendanceLinksDashboardPage />,
          "attendance-dashboard",
        ),
      },
      {
        path: "attendance-links/history",
        element: protectedElement(
          <AttendanceLinksDashboardPage />,
          "attendance-dashboard",
        ),
      },
      {
        path: "attendance-links/:linkId",
        element: protectedElement(<AttendanceLinkDetailPage />, "attendance-dashboard"),
      },
      {
        path: "attendance-operations",
        element: protectedElement(<AttendanceOperationsPage />, "attendance-dashboard"),
      },
      {
        path: "timetable",
        element: protectedElement(<TimetablePage />),
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
        path: "import-data/quarantine",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "import-data/history",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "import-data/quarantine/:id",
        element: protectedElement(<ImportQuarantineDetailPage />, "import-data"),
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
        path: "manage-student-accounts",
        element: protectedElement(<StudentAccountsPage />, "manage-student-accounts"),
      },
      {
        path: "manage-student-accounts/generate",
        element: protectedElement(<StudentAccountsPage />, "manage-student-accounts"),
      },
      {
        path: "manage-student-accounts/batch",
        element: protectedElement(<StudentAccountsPage />, "manage-student-accounts"),
      },
      {
        path: "manage-student-accounts/history",
        element: protectedElement(<StudentAccountsPage />, "manage-student-accounts"),
      },
      {
        path: "manage-users/history",
        element: protectedElement(<ManageUsersPage />, "manage-users-list"),
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
        path: "login-links",
        element: protectedElement(<LoginLinksPage />, "login-links"),
      },
      {
        path: "field-followers",
        element: protectedElement(<FieldFollowersReviewPage />, "field-monitor"),
      },
      {
        path: "field-follower-applications",
        element: protectedElement(<FieldFollowersReviewPage />, "field-monitor"),
      },
      {
        path: "field-followers/history",
        element: protectedElement(<FieldFollowersReviewPage />, "field-monitor"),
      },
      {
        path: "field-follower-applications/history",
        element: protectedElement(<FieldFollowersReviewPage />, "field-monitor"),
      },
      {
        path: "field-followers-review",
        element: <LegacyRouteRedirect to="/field-follower-applications" />,
      },
      {
        path: "field-followers-review/history",
        element: <LegacyRouteRedirect to="/field-follower-applications/history" />,
      },
      {
        path: "field-followers/:id",
        element: protectedElement(<FieldFollowerDetailPage />, "field-monitor"),
      },
      {
        path: "field-monitor-map",
        element: protectedElement(<FieldMonitorMapPage />, "field-monitor"),
      },
      {
        path: "work-session-monitor",
        element: protectedElement(<WorkSessionMonitorPage />, "field-monitor"),
      },
      {
        path: "login-links/history",
        element: protectedElement(<LoginLinksPage />, "login-links"),
      },
      {
        path: "login-links/:id",
        element: protectedElement(<LoginLinkDetailPage />, "login-links"),
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
        element: protectedElement(<StudentStatusesPage />, "settings"),
      },
      {
        path: "settings/master-data-lookups",
        element: protectedElement(<MasterDataLookupsPage />, "settings"),
      },
      {
        path: "tasks/:taskId",
        element: protectedElement(<TaskDetailPage />, "home"),
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
    path: "/task/:token/delegate",
    element: withSuspense(<DelegatePage />),
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
    path: "/task/:token/expired",
    element: withSuspense(<ExpiredPage />),
  },
  {
    path: "/task/:token/locked",
    element: withSuspense(<LockedPage />),
  },
  {
    path: "/login/magic/:token",
    element: withSuspense(<MagicLoginPage />),
  },
  {
    path: "/apply/field-follower/:code",
    element: withSuspense(<FieldFollowerApplicationPage />),
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
