import { lazy, Suspense, type ReactNode } from "react";
import { PageShell, SkeletonStack } from "../components/layout/page-primitives";

export const AdminAccessPage = lazy(() =>
  import("../features/auth/pages/AdminAccessPage").then((module) => ({
    default: module.AdminAccessPage,
  })),
);
export const AuditLogDetailPage = lazy(() =>
  import("../features/audit-log/pages/AuditLogDetailPage").then((module) => ({
    default: module.AuditLogDetailPage,
  })),
);
export const ChangePasswordPage = lazy(() =>
  import("../features/auth/pages/ChangePasswordPage").then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
export const ProfilePage = lazy(() =>
  import("../features/auth/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
export const NotificationsPage = lazy(() =>
  import("../features/notifications/pages/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
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
export const AttendanceOperationsPage = lazy(() =>
  import("../features/attendance/pages/AttendanceOperationsPage").then((module) => ({
    default: module.AttendanceOperationsPage,
  })),
);
export const ManageRoleGroupsPage = lazy(() =>
  import("../features/admin/pages/ManageRoleGroupsPage").then((module) => ({
    default: module.ManageRoleGroupsPage,
  })),
);
export const ManageRoleGroupFormPage = lazy(() =>
  import("../features/admin/pages/ManageRoleGroupFormPage").then((module) => ({
    default: module.ManageRoleGroupFormPage,
  })),
);
export const ManageUsersPage = lazy(() =>
  import("../features/admin/pages/ManageUsersPage").then((module) => ({
    default: module.ManageUsersPage,
  })),
);
export const UserDetailPage = lazy(() =>
  import("../features/admin/pages/UserDetailPage").then((module) => ({
    default: module.UserDetailPage,
  })),
);
export const StudentAccountsPage = lazy(() =>
  import("../features/admin/pages/StudentAccountsPage").then((module) => ({
    default: module.StudentAccountsPage,
  })),
);
export const StudentEditPage = lazy(() =>
  import("../features/students/pages/StudentEditPage").then((module) => ({
    default: module.StudentEditPage,
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
export const StudentStatusesPage = lazy(() =>
  import("../features/student-statuses/pages/StudentStatusesPage").then((module) => ({
    default: module.StudentStatusesPage,
  })),
);
export const MasterDataLookupsPage = lazy(() =>
  import("../features/master-data-lookups/pages/MasterDataLookupsPage").then((module) => ({
    default: module.MasterDataLookupsPage,
  })),
);
export const CasesListPage = lazy(() =>
  import("../features/cases/pages/CasesListPage").then((module) => ({
    default: module.CasesListPage,
  })),
);
export const DataExportsPage = lazy(() =>
  import("../features/data-exports/pages/DataExportsPage").then((module) => ({
    default: module.DataExportsPage,
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
export const ImportQuarantineDetailPage = lazy(() =>
  import("../features/import-data/pages/ImportQuarantineDetailPage").then((module) => ({
    default: module.ImportQuarantineDetailPage,
  })),
);
export const LoginLinksPage = lazy(() =>
  import("../features/login-links/pages/LoginLinksPage").then((module) => ({
    default: module.LoginLinksPage,
  })),
);
export const VisitLinksPage = lazy(() =>
  import("../features/visit-links/pages/VisitLinksPage").then((module) => ({
    default: module.VisitLinksPage,
  })),
);
export const FieldFollowerApplicationPage = lazy(() =>
  import("../features/field-followers/pages/FieldFollowerApplicationPage").then((module) => ({
    default: module.FieldFollowerApplicationPage,
  })),
);
export const FieldFollowersReviewPage = lazy(() =>
  import("../features/field-followers/pages/FieldFollowersReviewPage").then((module) => ({
    default: module.FieldFollowersReviewPage,
  })),
);
export const FieldFollowerDetailPage = lazy(() =>
  import("../features/field-followers/pages/FieldFollowerDetailPage").then((module) => ({
    default: module.FieldFollowerDetailPage,
  })),
);
export const FieldMonitorMapPage = lazy(() =>
  import("../features/field-followers/pages/FieldMonitorMapPage").then((module) => ({
    default: module.FieldMonitorMapPage,
  })),
);
export const TimetablePage = lazy(() =>
  import("../features/timetable/pages/TimetablePage").then((module) => ({
    default: module.TimetablePage,
  })),
);
export const SchoolStructurePage = lazy(() =>
  import("../features/school-structure/pages/SchoolStructurePage").then((module) => ({
    default: module.SchoolStructurePage,
  })),
);
export const ClassroomsPage = lazy(() =>
  import("../features/school-structure/pages/ClassroomsPage").then((module) => ({
    default: module.ClassroomsPage,
  })),
);
export const ClassroomDetailPage = lazy(() =>
  import("../features/school-structure/pages/ClassroomDetailPage").then((module) => ({
    default: module.ClassroomDetailPage,
  })),
);
export const TeacherAccessGrantsPage = lazy(() =>
  import("../features/teacher-access/pages/TeacherAccessGrantsPage").then((module) => ({
    default: module.TeacherAccessGrantsPage,
  })),
);
export const TeacherAccessGuestPage = lazy(() =>
  import("../features/teacher-access/pages/TeacherAccessGuestPage").then((module) => ({
    default: module.TeacherAccessGuestPage,
  })),
);

export const LoginLinkDetailPage = lazy(() =>
  import("../features/login-links/pages/LoginLinkDetailPage").then((module) => ({
    default: module.LoginLinkDetailPage,
  })),
);
export const StudentDetailPage = lazy(() =>
  import("../features/students/pages/StudentDetailPage").then((module) => ({
    default: module.StudentDetailPage,
  })),
);
export const CaseDetailPage = lazy(() =>
  import("../features/cases/pages/CaseDetailPage").then((module) => ({
    default: module.CaseDetailPage,
  })),
);
export const CaseReviewDetailPage = lazy(() =>
  import("../features/cases/pages/CaseReviewDetailPage").then((module) => ({
    default: module.CaseReviewDetailPage,
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

export const AttendanceLinkDetailPage = lazy(() =>
  import("../features/tasks/pages/AttendanceLinkDetailPage").then((module) => ({
    default: module.AttendanceLinkDetailPage,
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
export const TeacherObservationReportsPage = lazy(() =>
  import("../features/student-observations/pages/TeacherObservationReportsPage").then((module) => ({
    default: module.TeacherObservationReportsPage,
  })),
);
export const TeacherObservationDetailPage = lazy(() =>
  import("../features/student-observations/pages/TeacherObservationDetailPage").then((module) => ({
    default: module.TeacherObservationDetailPage,
  })),
);
export const HomeVisitRequestsPage = lazy(() =>
  import("../features/student-observations/pages/HomeVisitRequestsPage").then((module) => ({
    default: module.HomeVisitRequestsPage,
  })),
);
export const HomeVisitRequestDetailPage = lazy(() =>
  import("../features/student-observations/pages/HomeVisitRequestDetailPage").then((module) => ({
    default: module.HomeVisitRequestDetailPage,
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
export const CompletedPage = lazy(() =>
  import("../features/tasks/pages/StatusPage").then((module) => ({
    default: module.CompletedPage,
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
