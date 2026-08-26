import { lazy, Suspense, type ReactNode } from "react";
import { PageShell, SkeletonStack } from "../components/layout/page-primitives";

export const AdminAccessPage = lazy(() =>
  import("../features/auth/pages/AdminAccessPage").then((module) => ({
    default: module.AdminAccessPage,
  })),
);
export const AboutPage = lazy(() =>
  import("../features/public-info/pages/PublicInfoPages").then((module) => ({
    default: module.AboutPage,
  })),
);
export const PrivacyPolicyPage = lazy(() =>
  import("../features/public-info/pages/PublicInfoPages").then((module) => ({
    default: module.PrivacyPolicyPage,
  })),
);
export const AraIdSplashPage = lazy(() =>
  import("../features/araid/pages/AraIdSplashPage").then((module) => ({
    default: module.AraIdSplashPage,
  })),
);
export const AraIdLoginPage = lazy(() =>
  import("../features/araid/pages/AraIdLoginPage").then((module) => ({
    default: module.AraIdLoginPage,
  })),
);
export const AraIdPinPage = lazy(() =>
  import("../features/araid/pages/AraIdPinPage").then((module) => ({
    default: module.AraIdPinPage,
  })),
);
export const AraIdHomePage = lazy(() =>
  import("../features/araid/pages/AraIdHomePage").then((module) => ({
    default: module.AraIdHomePage,
  })),
);
export const AraIdDocumentsPage = lazy(() =>
  import("../features/araid/pages/AraIdDocumentsPage").then((module) => ({
    default: module.AraIdDocumentsPage,
  })),
);
export const AraIdSettingsPage = lazy(() =>
  import("../features/araid/pages/AraIdSettingsPage").then((module) => ({
    default: module.AraIdSettingsPage,
  })),
);
export const AraIdManagePage = lazy(() =>
  import("../features/araid/pages/AraIdManagePage").then((module) => ({
    default: module.AraIdManagePage,
  })),
);
export const AraIdAuthorizePage = lazy(() =>
  import("../features/araid/pages/AraIdAuthorizePage").then((module) => ({
    default: module.AraIdAuthorizePage,
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
  import("../features/notifications/pages/NotificationsPage").then(
    (module) => ({
      default: module.NotificationsPage,
    }),
  ),
);
export const AttendanceCheckInPage = lazy(() =>
  import("../features/check-in/pages/InternalCheckInPage").then((module) => ({
    default: module.InternalCheckInPage,
  })),
);
export const PublicCheckInPage = lazy(() =>
  import("../features/check-in/pages/PublicCheckInPage").then((module) => ({
    default: module.PublicCheckInPage,
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
  import("../features/curriculum/pages/CurriculumGradesPage").then(
    (module) => ({
      default: module.CurriculumGradesPage,
    }),
  ),
);
export const CurriculumSubjectsPage = lazy(() =>
  import("../features/curriculum/pages/CurriculumSubjectsPage").then(
    (module) => ({
      default: module.CurriculumSubjectsPage,
    }),
  ),
);
export const CurriculumSubjectFormPage = lazy(() =>
  import("../features/curriculum/pages/CurriculumSubjectFormPage").then(
    (module) => ({
      default: module.CurriculumSubjectFormPage,
    }),
  ),
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
export const TeacherProfilePage = lazy(() =>
  import("../features/teachers/pages/TeacherProfilePage").then((module) => ({
    default: module.TeacherProfilePage,
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
export const StudentCreatePage = lazy(() =>
  import("../features/students/pages/StudentCreatePage").then((module) => ({
    default: module.StudentCreatePage,
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
  import("../features/student-statuses/pages/StudentStatusesPage").then(
    (module) => ({
      default: module.StudentStatusesPage,
    }),
  ),
);
export const MasterDataPage = lazy(() =>
  import("../features/master-data/pages/MasterDataPage").then((module) => ({
    default: module.MasterDataPage,
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
  import("../features/import-data/pages/ImportQuarantineDetailPage").then(
    (module) => ({
      default: module.ImportQuarantineDetailPage,
    }),
  ),
);
export const SchoolStructurePage = lazy(() =>
  import("../features/school-structure/pages/SchoolStructurePage").then(
    (module) => ({
      default: module.SchoolStructurePage,
    }),
  ),
);
export const ClassroomsPage = lazy(() =>
  import("../features/school-structure/pages/ClassroomsPage").then(
    (module) => ({
      default: module.ClassroomsPage,
    }),
  ),
);
export const ClassroomLinksPage = lazy(() =>
  import("../features/classroom-links/pages/ClassroomLinksPage").then(
    (module) => ({ default: module.ClassroomLinksPage }),
  ),
);
export const ClassroomDetailPage = lazy(() =>
  import("../features/school-structure/pages/ClassroomDetailPage").then(
    (module) => ({
      default: module.ClassroomDetailPage,
    }),
  ),
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
export const TeacherLineLinkPage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineLinkPage").then(
    (module) => ({
      default: module.TeacherLineLinkPage,
    }),
  ),
);
export const TeacherLineAraIdAuthorizePage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineAraIdAuthorizePage").then(
    (module) => ({ default: module.TeacherLineAraIdAuthorizePage }),
  ),
);

export const TeacherLineAraIdChallengePage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineAraIdChallengePage").then(
    (module) => ({ default: module.TeacherLineAraIdChallengePage }),
  ),
);

export const TeacherLineInvitationPage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineInvitationPage").then(
    (module) => ({
      default: module.TeacherLineInvitationPage,
    }),
  ),
);

export const TeacherLineLinkResultPage = lazy(() =>
  import("../features/teacher-line/pages/TeacherLineLinkResultPage").then(
    (module) => ({
      default: module.TeacherLineLinkResultPage,
    }),
  ),
);

export const DashboardPage = lazy(() =>
  import("../features/tasks/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
export const TeacherCommentReportsPage = lazy(() =>
  import("../features/teacher-comments/pages/TeacherCommentReportsPage").then(
    (module) => ({
      default: module.TeacherCommentReportsPage,
    }),
  ),
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
export const TaskGoogleCallbackPage = lazy(() =>
  import("../features/tasks/pages/TaskGoogleCallbackPage").then((module) => ({
    default: module.TaskGoogleCallbackPage,
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
