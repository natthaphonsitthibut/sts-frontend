import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  MessageSquareText,
  SchoolIcon,
} from "lucide-react";
import { Card, IconButton } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { useSafeBackTarget } from "../../../components/layout/navigation-context";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { formatProblemCategoryOption } from "../../school-structure/lib/classroom-student-comment-form";
import { StudentAttendanceCalendar } from "../../students/components/StudentAttendanceCalendar";
import { StudentProfileHeader } from "../../students/components/StudentProfileHeader";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import {
  useCreateTeacherStudentComment,
  useTeacherStudentPhoto,
  useTeacherStudentProfile,
} from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";
import { assignmentClassLabel } from "../lib/teacher-link-presentation";

/**
 * The staff student profile, opened from a teacher link. It renders the same
 * header, comments and attendance calendar as `/students/:id`; the data comes
 * from one grant-scoped read instead of the authenticated student APIs, and the
 * PII dialogs (contacts, address) stay closed because a link is not an account.
 */

export function TeacherStudentProfilePage() {
  const safeBackTarget = useSafeBackTarget();
  const { assignmentId = "", studentUuid = "" } = useParams();
  const { context } = useTeacherLink();
  const assignment = context.assignments.find(
    (item) => item.id === assignmentId,
  );
  const profileQuery = useTeacherStudentProfile(
    Number(assignmentId),
    studentUuid,
  );
  const profile = profileQuery.data;
  const photoQuery = useTeacherStudentPhoto(
    Number(assignmentId) || undefined,
    studentUuid || undefined,
    Boolean(profile?.student?.photo_url),
  );
  const studentPhotoUrl = useBlobObjectUrl(photoQuery.data);
  const [commentOpen, setCommentOpen] = useState(false);
  const createComment = useCreateTeacherStudentComment(
    Number(assignmentId) || 0,
  );

  const breadcrumb = [
    {
      label: "ห้องเรียนของฉัน",
      icon: PAGE_ICONS["school-building"],
      to: "/teacher-access",
    },
    {
      label: `ห้อง ${assignment ? assignmentClassLabel(assignment) : ""}`,
      icon: PAGE_ICONS["school-building"],
      to: `/teacher-access/classes/${assignmentId}/roster`,
    },
  ];
  const backAction = (
    <NavButton icon={ArrowLeft} to={safeBackTarget} variant="outline">
      ย้อนกลับ
    </NavButton>
  );

  if (profileQuery.isLoading) {
    return (
      <TeacherLinkShell
        breadcrumb={breadcrumb}
        icon={PAGE_ICONS["user-graduate"]}
        navigation={backAction}
        title="ข้อมูลนักเรียน"
      >
        <Card className="mb-5 p-5">
          <SkeletonStack lines={3} />
        </Card>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="p-5">
            <SkeletonStack lines={4} />
          </Card>
          <Card className="p-5">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </TeacherLinkShell>
    );
  }

  if (profileQuery.isError) {
    return (
      <TeacherLinkShell
        navigation={backAction}
        breadcrumb={breadcrumb}
        icon={PAGE_ICONS["user-graduate"]}
        title="ข้อมูลนักเรียน"
      >
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void profileQuery.refetch()}
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
        />
      </TeacherLinkShell>
    );
  }

  if (!profile?.student || !profile.summary) {
    return (
      <TeacherLinkShell
        navigation={backAction}
        breadcrumb={breadcrumb}
        icon={PAGE_ICONS["user-graduate"]}
        title="ข้อมูลนักเรียน"
      >
        <EmptyState
          description="ไม่พบข้อมูลนักเรียนคนนี้ในห้องที่ลิงก์ของคุณดูแล"
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
        />
      </TeacherLinkShell>
    );
  }

  const observations = profile.observations?.data ?? [];
  // Two stores, one section: an observation and a roster comment are both
  // "what a teacher wrote", so the card lists them together, newest first.
  const teacherNotes = [
    ...observations.map((observation) => ({
      id: `observation-${observation.id}`,
      authorName: observation.author.displayName,
      createdAt: observation.observedAt,
      text: observation.comment ?? "",
      problemCategoryLabel: null,
      problemCategoryGuidance: null,
    })),
    ...(profile.comments ?? []).map((comment) => ({
      id: `comment-${comment.id}`,
      authorName: comment.authorName,
      createdAt: comment.createdAt,
      text: comment.problemDescription,
      problemCategoryLabel: comment.problemCategoryLabel,
      problemCategoryGuidance: comment.problemCategoryGuidance,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const studentFullName =
    `${profile.student.FirstName_Onec ?? ""} ${profile.student.LastName_Onec ?? ""}`.trim() ||
    "ไม่ระบุชื่อ";
  const studentNumber =
    typeof profile.student.student_number === "string"
      ? profile.student.student_number
      : null;

  return (
    <TeacherLinkShell
      navigation={backAction}
      breadcrumb={breadcrumb}
      icon={PAGE_ICONS["user-graduate"]}
      title="ข้อมูลนักเรียน"
    >
      <StudentProfileHeader
        key={studentUuid}
        student={{ ...profile.student, photo_url: studentPhotoUrl }}
        studentId={studentUuid}
        summary={profile.summary}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <MessageSquareText
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                ความคิดเห็นจากคุณครู
              </h2>
              {assignment ? (
                <IconButton
                  aria-label={`เพิ่มความคิดเห็นของ ${studentFullName}`}
                  icon={MessageSquareText}
                  onClick={() => setCommentOpen(true)}
                  variant="comment"
                />
              ) : null}
            </div>
            {teacherNotes.length === 0 ? (
              <EmptyState
                className="border-none py-6 shadow-none"
                description="ความคิดเห็นที่ครูบันทึกจะปรากฏในส่วนนี้"
                icon={MessageSquareText}
                title="ยังไม่มีความคิดเห็นจากคุณครู"
              />
            ) : (
              <ul className="space-y-3">
                {teacherNotes.slice(0, 5).map((note) => (
                  <li
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={note.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
                      <strong className="font-semibold text-slate-800">
                        ผู้รายงาน: {note.authorName}
                      </strong>
                      <time dateTime={note.createdAt}>
                        {formatThaiDateTime(note.createdAt)}
                      </time>
                    </div>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                      {note.problemCategoryLabel ? (
                        <p>
                          <span className="font-medium text-slate-800">หัวข้อปัญหา:</span>{" "}
                          {formatProblemCategoryOption({
                            label: note.problemCategoryLabel,
                            guidance: note.problemCategoryGuidance,
                          })}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">
                        {note.problemCategoryLabel ? (
                          <><span className="font-medium text-slate-800">คำอธิบาย:</span>{" "}</>
                        ) : null}
                        {note.text || "ไม่ได้ระบุความคิดเห็นเพิ่มเติม"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <SchoolIcon aria-hidden="true" className="size-4 text-primary" />
              ประวัติความเสี่ยง
            </h2>
            {profile.cases.length === 0 ? (
              <EmptyState
                className="border-none py-6 shadow-none"
                description="เมื่อมีเคสติดตาม รายการจะปรากฏในส่วนนี้"
                icon={CircleAlert}
                title="ยังไม่มีเคสติดตาม"
              />
            ) : (
              <ul className="space-y-3">
                {profile.cases.slice(0, 5).map((studentCase) => (
                  <li
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    key={studentCase.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">
                        {studentCase.status}
                      </span>
                      <time
                        className="text-xs text-slate-500"
                        dateTime={studentCase.created_at}
                      >
                        {formatThaiDateTime(studentCase.created_at)}
                      </time>
                    </div>
                    {studentCase.reason_flagged ? (
                      <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                        {studentCase.reason_flagged}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="lg:col-span-3">
          <StudentAttendanceCalendar
            key={studentUuid}
            studentId={studentUuid}
            summary={profile.summary}
            teacherLinkAssignmentId={Number(assignmentId)}
          />
        </div>
      </div>

      <ClassroomStudentCommentDialog
        classroomId={Number(assignment?.classroomId ?? 0)}
        isSubmitting={createComment.isPending}
        onOpenChange={(open) => {
          if (!open) setCommentOpen(false);
        }}
        problemCategories={context.problemCategories}
        student={
          commentOpen
            ? {
                studentUuid,
                firstName: profile.student.FirstName_Onec ?? null,
                lastName: profile.student.LastName_Onec ?? null,
                studentNumber,
              }
            : null
        }
        submitComment={async ({
          studentUuid: targetUuid,
          problemCategory,
          problemDescription,
        }) => {
          await createComment.mutateAsync({
            studentUuid: targetUuid,
            problemCategory,
            problemDescription,
          });
          await profileQuery.refetch();
        }}
        submitError={createComment.error}
      />
    </TeacherLinkShell>
  );
}
