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
export const CurriculumGradesPage = lazy(() =>
  import("../features/curriculum/pages/CurriculumGradesPage").then((module) => ({
    default: module.CurriculumGradesPage,
  })),
);
export const CurriculumSubjectsPage = lazy(() =>
  import("../features/curriculum/pages/CurriculumSubjectsPage").then((module) => ({
    default: module.CurriculumSubjectsPage,
  })),
);
export const CurriculumSubjectFormPage = lazy(() =>
  import("../features/curriculum/pages/CurriculumSubjectFormPage").then((module) => ({
    default: module.CurriculumSubjectFormPage,
  })),
);
export const TeachersPage = lazy(() =>
  import("../features/teachers/pages/TeachersPage").then((module) => ({
    default: module.TeachersPage,
  })),
);
export const TeacherFormPage = lazy(() =>
  import("../features/teachers/pages/TeacherFormPage").then((module) => ({
    default: module.TeacherFormPage,
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
export const TeacherLineLinkPage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineLinkPage").then((module) => ({
    default: module.TeacherLineLinkPage,
  })),
);

export const TeacherLineLinkResultPage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineLinkResultPage").then((module) => ({
    default: module.TeacherLineLinkResultPage,
  })),
);

export const TeacherAttendanceLinksPage = lazy(() =>
  import("../features/teacher-access/pages/TeacherAttendanceLinksPage").then((module) => ({
    default: module.TeacherAttendanceLinksPage,
  })),
);

export const TeacherLinkLayout = lazy(() =>
  import("../features/teacher-access/pages/TeacherLinkLayout").then((module) => ({
    default: module.TeacherLinkLayout,
  })),
);

export const MyClassroomsPage = lazy(() =>
  import("../features/teacher-access/pages/MyClassroomsPage").then((module) => ({
    default: module.MyClassroomsPage,
  })),
);

export const TeacherClassroomPage = lazy(() =>
  import("../features/teacher-access/pages/TeacherClassroomPage").then((module) => ({
    default: module.TeacherClassroomPage,
  })),
);

export const TeacherStudentProfilePage = lazy(() =>
  import("../features/teacher-access/pages/TeacherStudentProfilePage").then((module) => ({
    default: module.TeacherStudentProfilePage,
  })),
);

export const TeacherTimetablePage = lazy(() =>
  import("../features/teacher-access/pages/TeacherTimetablePage").then((module) => ({
    default: module.TeacherTimetablePage,
  })),
);

export const TeacherAttendanceHistoryPage = lazy(() =>
  import("../features/teacher-access/pages/TeacherAttendanceHistoryPage").then((module) => ({
    default: module.TeacherAttendanceHistoryPage,
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
export const TeacherCommentReportsPage = lazy(() =>
  import("../features/student-observations/pages/TeacherCommentReportsPage").then((module) => ({
    default: module.TeacherCommentReportsPage,
  })),
);
export const DelegatePage = lazy(() =>
  import("../features/tasks/pages/DelegatePage").then((module) => ({
    default: module.DelegatePage,
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
