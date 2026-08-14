import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  CircleAlert,
  History,
  MessageSquareText,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Button, Card, IconButton, SchoolIcon } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { NavButton } from "../../../components/layout/nav-button";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { StudentCaseAction } from "../../cases/components/StudentCaseAction";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { useStudentClassroomComments } from "../../school-structure/hooks/useSchoolStructure";
import { StudentAttendanceCalendar } from "../components/StudentAttendanceCalendar";
import {
  StudentContactDialog,
  StudentLocationDialog,
} from "../components/StudentProfileDialogs";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentCases } from "../hooks/useStudentCases";
import { useStudentProfileSummary } from "../hooks/useStudentProfileSummary";
import type { StudentCase, StudentDetail } from "../types/students.types";

function RiskHistoryPanel({
  canViewCaseDetail,
  cases,
  isError,
  isLoading,
  onRetry,
}: {
  canViewCaseDetail: boolean;
  cases: StudentCase[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const sortedCases = useMemo(
    () =>
      [...cases].sort((left, right) => {
        if (left.status === "OPEN" && right.status !== "OPEN") return -1;
        if (left.status !== "OPEN" && right.status === "OPEN") return 1;
        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      }),
    [cases],
  );

  const visibleCases = showAll ? sortedCases : sortedCases.slice(0, 3);

  return (
    <Card className="flex min-h-0 flex-1 flex-col p-5" id="case-history">
      <h2 className="mb-4 flex shrink-0 items-center gap-2 text-base font-bold text-slate-900">
        <History className="size-5 text-ink" aria-hidden="true" />
        ประวัติการติดตามนักเรียน
      </h2>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <SkeletonStack lines={3} className="py-2" />
        ) : isError ? (
          <ErrorState title="โหลดประวัติการติดตามไม่สำเร็จ" onRetry={onRetry} />
        ) : sortedCases.length === 0 ? (
          <EmptyState
            className="border-none py-6 shadow-none"
            description="รายการติดตามและการดำเนินการของนักเรียนจะปรากฏในส่วนนี้"
            icon={History}
            title="ยังไม่มีประวัติการติดตามนักเรียน"
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {visibleCases.map((studentCase) => (
                <li
                  key={studentCase.id}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {formatThaiDate(studentCase.created_at)}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-700">
                      {studentCase.reason_flagged}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CaseStatusBadge status={studentCase.status} />
                    {canViewCaseDetail ? (
                      <DetailLinkButton
                        aria-label="ดูรายละเอียดเคส"
                        className="size-8"
                        iconClassName="size-5"
                        iconOnly
                        title="ดูรายละเอียดเคส"
                        to={`/cases/${studentCase.id}`}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {sortedCases.length > 3 ? (
              <div className="mt-2 text-right">
                <Button
                  className="font-medium text-slate-600 underline"
                  onClick={() => setShowAll((current) => !current)}
                  size="sm"
                  variant="ghost"
                >
                  {showAll ? "แสดงน้อยลง" : "เพิ่มเติม"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

function TeacherCommentsPanel({
  student,
  studentId,
}: {
  student: StudentDetail;
  studentId: string;
}) {
  const commentsQuery = useStudentClassroomComments(studentId);
  const comments = commentsQuery.data?.data ?? [];
  const [commentOpen, setCommentOpen] = useState(false);
  // student_term.classroom_id decides which roster the comment is filed under;
  // without it the write has no destination, so the action stays hidden.
  const classroomId = Number(student.classroom_id ?? 0);
  const fullName =
    `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
    "ไม่ระบุชื่อ";

  return (
    <Card
      className="relative flex min-h-0 flex-1 flex-col p-5"
      data-student-teacher-comments
    >
      <h2 className="mb-4 flex shrink-0 items-center gap-2 pr-12 text-base font-bold text-slate-900">
        <MessageSquareText className="size-5 text-ink" aria-hidden="true" />
        ความคิดเห็นจากคุณครู
      </h2>
      {classroomId ? (
        <IconButton
          aria-label={`เพิ่มความคิดเห็นของ ${fullName}`}
          className="absolute right-5 top-5"
          icon={MessageSquareText}
          iconClassName="size-5"
          onClick={() => setCommentOpen(true)}
          size="sm"
          variant="comment"
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {commentsQuery.isLoading ? (
          <SkeletonStack lines={2} />
        ) : commentsQuery.isError ? (
          <ErrorState
            description="ส่วนอื่นของข้อมูลนักเรียนยังใช้งานได้ตามปกติ"
            onRetry={() => void commentsQuery.refetch()}
            title="โหลดความคิดเห็นจากคุณครูไม่สำเร็จ"
          />
        ) : comments.length === 0 ? (
          <EmptyState
            className="border-none py-6 shadow-none"
            description="ความคิดเห็นที่ครูบันทึกจะปรากฏในส่วนนี้"
            icon={MessageSquareText}
            title="ยังไม่มีความคิดเห็นจากคุณครู"
          />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                key={comment.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
                  <strong className="text-sm font-bold text-slate-800">
                    ผู้รายงาน: {comment.authorDisplayName}
                  </strong>
                  <time dateTime={comment.commentedAt}>
                    {formatThaiDateTime(comment.commentedAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {comment.comment}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClassroomStudentCommentDialog
        classroomId={classroomId}
        onOpenChange={(open) => {
          if (!open) setCommentOpen(false);
        }}
        student={
          commentOpen
            ? {
                studentUuid: studentId,
                firstName: student.FirstName_Onec ?? null,
                lastName: student.LastName_Onec ?? null,
                studentNumber:
                  typeof student.student_number === "string"
                    ? student.student_number
                    : null,
              }
            : null
        }
      />
    </Card>
  );
}

export function StudentDetailPage() {
  const { can } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const studentId = id?.trim();
  const [contactsOpen, setContactsOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [calendarBoxHeight, setCalendarBoxHeight] = useState<number | null>(
    null,
  );

  const { student, isLoading, isError, refetch } = useStudent(studentId);
  const profileSummaryQuery = useStudentProfileSummary(studentId);
  const {
    cases,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useStudentCases(studentId);
  const activeCases = useMemo(
    () =>
      cases.filter((studentCase) =>
        ["OPEN", "IN_PROGRESS", "PENDING_REVIEW"].includes(studentCase.status),
      ),
    [cases],
  );

  if (isLoading || profileSummaryQuery.isLoading) {
    // Mirrors the loaded page's grid (profile header, then a 2/5 + 3/5 row) so
    // the swap from skeleton to real content doesn't shift the page height —
    // a mismatched skeleton is what makes that transition read as a jump.
    return (
      <PageShell>
        <Card className="mb-5 p-5 sm:p-6">
          <SkeletonStack lines={5} />
        </Card>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <Card className="min-h-[210px] p-5">
              <SkeletonStack lines={3} />
            </Card>
            <Card className="min-h-[210px] p-5">
              <SkeletonStack lines={3} />
            </Card>
          </div>
          <Card className="min-h-[700px] p-5 lg:col-span-3">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </PageShell>
    );
  }

  if (isError || profileSummaryQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            refetch();
            void profileSummaryQuery.refetch();
          }}
        />
      </PageShell>
    );
  }

  if (!studentId || !student || !profileSummaryQuery.data) {
    return (
      <PageShell>
        <EmptyState
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
          description="ไม่พบข้อมูลนักเรียนระเบียนหรือรหัสนี้ในระบบ"
          action={
            <NavButton to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          can("review-cases") && !casesLoading ? (
            <StudentCaseAction
              activeCaseCount={activeCases.length}
              activeCaseId={
                activeCases.length > 0 ? Number(activeCases[0].id) : null
              }
              mode="button"
              studentId={studentId}
              studentName={
                `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
                "นักเรียน"
              }
            />
          ) : null
        }
        icon={SchoolIcon}
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="ข้อมูลนักเรียน"
      />

      <StudentProfileHeader
        canEditPhoto={can("edit-students")}
        contactsOpen={contactsOpen}
        key={studentId}
        locationOpen={locationOpen}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setLocationOpen(true)}
        student={student}
        studentId={studentId}
        summary={profileSummaryQuery.data}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <div
          className="flex min-h-0 flex-col gap-5 lg:col-span-2 lg:h-[var(--calendar-box-height)]"
          style={
            calendarBoxHeight
              ? ({
                  "--calendar-box-height": `${calendarBoxHeight}px`,
                } as CSSProperties)
              : undefined
          }
        >
          {can("manage-student-observations") ? (
            <TeacherCommentsPanel student={student} studentId={studentId} />
          ) : null}
          <RiskHistoryPanel
            canViewCaseDetail={can("review-cases")}
            cases={cases}
            isError={casesError}
            isLoading={casesLoading}
            onRetry={refetchCases}
          />
        </div>
        <div className="lg:col-span-3">
          <StudentAttendanceCalendar
            key={studentId}
            onCalendarBoxHeightChange={setCalendarBoxHeight}
            studentId={studentId}
            summary={profileSummaryQuery.data}
          />
        </div>
      </div>

      <StudentContactDialog
        onOpenChange={setContactsOpen}
        open={contactsOpen}
        student={student}
      />
      <StudentLocationDialog
        onOpenChange={setLocationOpen}
        open={locationOpen}
        student={student}
      />
    </PageShell>
  );
}
