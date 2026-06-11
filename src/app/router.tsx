import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import {
  AdminAccessPage,
  AttendanceCheckInPage,
  AttendanceLinksDashboardPage,
  AttendanceRecordPage,
  CasesListPage,
  ChangePasswordPage,
  CreateTaskPage,
  DashboardPage,
  DelegatePage,
  ExpiredPage,
  ForbiddenPage,
  ImportDataPage,
  LockedPage,
  LoginLinksPage,
  MagicLoginPage,
  MainPage,
  ManageRoleGroupsPage,
  ManageUsersPage,
  NotFoundPage,
  ReportPage,
  RouteSuspense,
  StudentDetailPage,
  StudentListPage,
  StudentSelfPage,
  SuccessPage,
  SystemSettingsPage,
  TaskDetailPage,
  TaskGuestPage,
} from "./lazy-pages";

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
        path: "dashboard",
        element: protectedElement(<DashboardPage />, "dashboard"),
      },
      {
        path: "change-password",
        element: withSuspense(<ChangePasswordPage />),
      },
      {
        path: "students",
        element: protectedElement(<StudentListPage />, "students"),
      },
      {
        path: "students/:id",
        element: protectedElement(<StudentDetailPage />, "students"),
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
        path: "attendance",
        element: protectedElement(<AttendanceCheckInPage />, "attendance"),
      },
      {
        path: "attendance/record/:classId",
        element: protectedElement(<AttendanceRecordPage />, "attendance"),
      },
      {
        path: "cases",
        element: protectedElement(<CasesListPage />, "students"),
      },
      {
        path: "attendance-dashboard",
        element: protectedElement(
          <AttendanceLinksDashboardPage />,
          "attendance-dashboard",
        ),
      },
      {
        path: "import-data",
        element: protectedElement(<ImportDataPage />, "import-data"),
      },
      {
        path: "manage-users",
        element: protectedElement(<ManageUsersPage />, "manage-users-list"),
      },
      {
        path: "manage-role-groups",
        element: protectedElement(
          <ManageRoleGroupsPage />,
          "manage-role-groups",
        ),
      },
      {
        path: "login-links",
        element: protectedElement(<LoginLinksPage />, "login-links"),
      },
      {
        path: "settings",
        element: protectedElement(<SystemSettingsPage />, "settings"),
      },
      {
        path: "task-detail/:taskId",
        element: protectedElement(<TaskDetailPage />, "home"),
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
    path: "/admin-access",
    element: withSuspense(<AdminAccessPage />),
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
