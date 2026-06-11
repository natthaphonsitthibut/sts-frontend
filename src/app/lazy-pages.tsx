import { lazy, Suspense, type ReactNode } from "react";
import { PageShell, SkeletonStack } from "../components/layout/page-primitives";

export const AdminAccessPage = lazy(() =>
  import("../features/auth/pages/AdminAccessPage").then((module) => ({
    default: module.AdminAccessPage,
  })),
);
export const ChangePasswordPage = lazy(() =>
  import("../features/auth/pages/ChangePasswordPage").then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
export const AttendanceCheckInPage = lazy(() =>
  import("../features/attendance/pages/AttendanceCheckInPage").then((module) => ({
    default: module.AttendanceCheckInPage,
  })),
);
export const AttendanceRecordPage = lazy(() =>
  import("../features/attendance/pages/AttendanceRecordPage").then((module) => ({
    default: module.AttendanceRecordPage,
  })),
);
export const ManageRoleGroupsPage = lazy(() =>
  import("../features/admin/pages/ManageRoleGroupsPage").then((module) => ({
    default: module.ManageRoleGroupsPage,
  })),
);
export const ManageUsersPage = lazy(() =>
  import("../features/admin/pages/ManageUsersPage").then((module) => ({
    default: module.ManageUsersPage,
  })),
);
export const ManageUserFormPage = lazy(() =>
  import("../features/admin/pages/ManageUserFormPage").then((module) => ({
    default: module.ManageUserFormPage,
  })),
);
export const SystemSettingsPage = lazy(() =>
  import("../features/admin/pages/SystemSettingsPage").then((module) => ({
    default: module.SystemSettingsPage,
  })),
);
export const CasesListPage = lazy(() =>
  import("../features/cases/pages/CasesListPage").then((module) => ({
    default: module.CasesListPage,
  })),
);
export const MainPage = lazy(() =>
  import("../features/home/pages/MainPage").then((module) => ({
    default: module.MainPage,
  })),
);
export const ImportDataPage = lazy(() =>
  import("../features/import-data/pages/ImportDataPage").then((module) => ({
    default: module.ImportDataPage,
  })),
);
export const LoginLinksPage = lazy(() =>
  import("../features/login-links/pages/LoginLinksPage").then((module) => ({
    default: module.LoginLinksPage,
  })),
);
export const StudentDetailPage = lazy(() =>
  import("../features/students/pages/StudentDetailPage").then((module) => ({
    default: module.StudentDetailPage,
  })),
);
export const StudentListPage = lazy(() =>
  import("../features/students/pages/StudentListPage").then((module) => ({
    default: module.StudentListPage,
  })),
);
export const StudentSelfPage = lazy(() =>
  import("../features/students/pages/StudentSelfPage").then((module) => ({
    default: module.StudentSelfPage,
  })),
);
export const AttendanceLinksDashboardPage = lazy(() =>
  import("../features/tasks/pages/AttendanceLinksDashboardPage").then((module) => ({
    default: module.AttendanceLinksDashboardPage,
  })),
);
export const CreateTaskPage = lazy(() =>
  import("../features/tasks/pages/CreateTaskPage").then((module) => ({
    default: module.CreateTaskPage,
  })),
);
export const DashboardPage = lazy(() =>
  import("../features/tasks/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
export const DelegatePage = lazy(() =>
  import("../features/tasks/pages/DelegatePage").then((module) => ({
    default: module.DelegatePage,
  })),
);
export const MagicLoginPage = lazy(() =>
  import("../features/tasks/pages/MagicLoginPage").then((module) => ({
    default: module.MagicLoginPage,
  })),
);
export const ReportPage = lazy(() =>
  import("../features/tasks/pages/ReportPage").then((module) => ({
    default: module.ReportPage,
  })),
);
export const ExpiredPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.ExpiredPage,
  })),
);
export const ForbiddenPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.ForbiddenPage,
  })),
);
export const LockedPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.LockedPage,
  })),
);
export const NotFoundPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);
export const SuccessPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.SuccessPage,
  })),
);
export const TaskDetailPage = lazy(() =>
  import("../features/tasks/pages/TaskDetailPage").then((module) => ({
    default: module.TaskDetailPage,
  })),
);
export const TaskGuestPage = lazy(() =>
  import("../features/tasks/pages/TaskGuestPage").then((module) => ({
    default: module.TaskGuestPage,
  })),
);

export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageShell>
          <SkeletonStack lines={5} />
        </PageShell>
      }
    >
      {children}
    </Suspense>
  );
}
