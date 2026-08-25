import { useMemo, useState } from "react";
import { History, LineChart, MessageSquareText } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Tabs,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { formatThaiDateTimeWithSeconds } from "../../../lib/date-time";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { useStudentClassroomComments } from "../../school-structure/hooks/useSchoolStructure";
import { formatProblemCategoryOption } from "../../school-structure/lib/classroom-student-comment-form";
import { getConcernLevelPresentation } from "../../teacher-comments/lib/comment-presentation";
import {
  StudentActivityTimeline,
  type StudentTimelineEntry,
} from "./StudentActivityTimeline";
import type { StudentCase, StudentDetail } from "../types/students.types";

const TAB_COMMENTS = "comments";
const TAB_CASES = "cases";
const TAB_TIMELINE = "timeline";

/** Which badge treatment each timeline source uses — shared variants, no literal colours. */
const TIMELINE_SOURCES = {
  comment: { label: "ความคิดเห็นจากคุณครู", variant: "purple" },
  case: { label: "ประวัติการติดตาม", variant: "success" },
} as const;

interface StudentActivityPanelProps {
  canManageComments: boolean;
  canViewCaseDetail: boolean;
  cases: StudentCase[];
  casesError: boolean;
  casesLoading: boolean;
  onRetryCases: () => void;
  student: StudentDetail;
  studentId: string;
}

/**
 * The student's activity in one card: teacher comments, follow-up history, and
 * a timeline that merges both newest-first. Three views of the same data belong
 * behind tabs rather than as stacked cards competing for the same column.
 */
export function StudentActivityPanel({
  canManageComments,
  canViewCaseDetail,
  cases,
  casesError,
  casesLoading,
  onRetryCases,
  student,
  studentId,
}: StudentActivityPanelProps) {
  const [tab, setTab] = useState<string>(TAB_COMMENTS);
  const [showAllCases, setShowAllCases] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const commentsQuery = useStudentClassroomComments(studentId);
  const comments = useMemo(
    () => commentsQuery.data?.data ?? [],
    [commentsQuery.data],
  );

  // student_term.classroom_id decides which roster a comment is filed under;
  // without it the write has no destination, so the action stays hidden.
  const classroomId = Number(student.classroom_id ?? 0);
  const fullName =
    `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
    "ไม่ระบุชื่อ";

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
  const visibleCases = showAllCases ? sortedCases : sortedCases.slice(0, 3);

  const timelineEntries = useMemo<StudentTimelineEntry[]>(
    () => [
      ...comments.map((comment) => ({
        id: `comment:${comment.id}`,
        occurredAt: comment.commentedAt,
        sourceLabel: TIMELINE_SOURCES.comment.label,
        sourceVariant: TIMELINE_SOURCES.comment.variant,
        title: `ผู้รายงาน: ${comment.authorDisplayName}`,
        lines: [
          `หัวข้อปัญหา: ${formatProblemCategoryOption({
            label: comment.problemCategoryLabel,
            guidance: comment.problemCategoryGuidance,
          })}`,
          `ระดับข้อสังเกต: ${comment.concernLevelLabel}`,
          `คำอธิบาย: ${comment.problemDescription}`,
        ],
      })),
      ...cases.map((studentCase) => ({
        id: `case:${studentCase.id}`,
        occurredAt: studentCase.created_at,
        sourceLabel: TIMELINE_SOURCES.case.label,
        sourceVariant: TIMELINE_SOURCES.case.variant,
        title: `สาเหตุการติดตาม: ${studentCase.reason_flagged || "-"}`,
        lines: [],
        // The timeline is a way into the case, not just a record of it — the
        // same status badge and detail link the ประวัติการติดตาม tab offers.
        footer: (
          <>
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
          </>
        ),
      })),
    ],
    [canViewCaseDetail, cases, comments],
  );

  return (
    <Card
      className="relative flex min-h-0 flex-1 flex-col p-5"
      data-student-activity-panel
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <Tabs
          aria-label="มุมมองความเคลื่อนไหวของนักเรียน"
          onChange={setTab}
          options={[
            {
              value: TAB_COMMENTS,
              label: (
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                  ความคิดเห็นจากคุณครู
                </span>
              ),
            },
            {
              value: TAB_CASES,
              label: (
                <span className="flex items-center gap-1.5">
                  <History className="size-4" aria-hidden="true" />
                  ประวัติการติดตาม
                </span>
              ),
            },
            {
              value: TAB_TIMELINE,
              label: (
                <span className="flex items-center gap-1.5">
                  <LineChart className="size-4" aria-hidden="true" />
                  ไทม์ไลน์
                </span>
              ),
            },
          ]}
          value={tab}
        />
        {canManageComments && classroomId && tab === TAB_COMMENTS ? (
          <IconButton
            aria-label={`เพิ่มความคิดเห็นของ ${fullName}`}
            icon={MessageSquareText}
            iconClassName="size-5"
            onClick={() => setCommentOpen(true)}
            size="sm"
            variant="comment"
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === TAB_COMMENTS ? (
          commentsQuery.isLoading ? (
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
                      {formatThaiDateTimeWithSeconds(comment.commentedAt)}
                    </time>
                  </div>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                    <Badge
                      variant={
                        getConcernLevelPresentation(comment.concernLevelCode)
                          .variant
                      }
                    >
                      {comment.concernLevelLabel}
                    </Badge>
                    <p>
                      <span className="font-medium text-slate-800">
                        หัวข้อปัญหา:
                      </span>{" "}
                      {formatProblemCategoryOption({
                        label: comment.problemCategoryLabel,
                        guidance: comment.problemCategoryGuidance,
                      })}
                    </p>
                    <p className="whitespace-pre-wrap">
                      <span className="font-medium text-slate-800">
                        คำอธิบาย:
                      </span>{" "}
                      {comment.problemDescription}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === TAB_CASES ? (
          casesLoading ? (
            <SkeletonStack className="py-2" lines={3} />
          ) : casesError ? (
            <ErrorState
              onRetry={onRetryCases}
              title="โหลดประวัติการติดตามไม่สำเร็จ"
            />
          ) : sortedCases.length === 0 ? (
            <EmptyState
              className="border-none py-6 shadow-none"
              description="รายการติดตามและการดำเนินการของนักเรียนจะปรากฏในส่วนนี้"
              icon={History}
              title="ยังไม่มีประวัติการติดตามนักเรียน"
            />
          ) : (
            <>
              {/* Same card treatment as the comments tab, so switching between
                  the two views does not change the shape of a row. */}
              <ul className="space-y-3">
                {visibleCases.map((studentCase) => (
                  <li
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={studentCase.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
                      <strong className="text-sm font-bold text-slate-800">
                        สาเหตุการติดตาม: {studentCase.reason_flagged || "-"}
                      </strong>
                      <time dateTime={studentCase.created_at}>
                        {formatThaiDateTimeWithSeconds(studentCase.created_at)}
                      </time>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
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
                    onClick={() => setShowAllCases((current) => !current)}
                    size="sm"
                    variant="ghost"
                  >
                    {showAllCases ? "แสดงน้อยลง" : "เพิ่มเติม"}
                  </Button>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {tab === TAB_TIMELINE ? (
          <StudentActivityTimeline entries={timelineEntries} />
        ) : null}
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
