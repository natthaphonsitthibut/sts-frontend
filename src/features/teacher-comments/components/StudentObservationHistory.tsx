import { useId } from "react";
import { MessageSquareText } from "lucide-react";
import { Badge } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useStudentClassroomComments } from "../../school-structure/hooks/useSchoolStructure";
import type { StudentClassroomComment } from "../../school-structure/types/school-structure.types";
import { getConcernLevelPresentation } from "../lib/comment-presentation";

/**
 * Every observation teachers wrote about a student, split into the current
 * round and history when an earlier case or watch was closed. Shared by the
 * เฝ้าระวัง dialog and the case page.
 */
export function StudentObservationHistory({
  lastCaseResolvedAt = null,
  lastWatchClosedAt = null,
  studentId,
}: {
  lastCaseResolvedAt?: string | null;
  /** A watch closed without a case starts a new round, like a closed case. */
  lastWatchClosedAt?: string | null;
  studentId: string;
}) {
  const commentsQuery = useStudentClassroomComments(studentId);
  const comments = commentsQuery.data?.data ?? [];

  if (commentsQuery.isLoading) return <SkeletonStack lines={3} />;
  if (commentsQuery.isError) {
    return (
      <ErrorState
        title="โหลดข้อสังเกตไม่สำเร็จ"
        description="กรุณาลองใหม่อีกครั้ง"
        onRetry={() => void commentsQuery.refetch()}
      />
    );
  }
  if (comments.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีข้อสังเกต"
        description="ข้อสังเกตที่ครูบันทึกจะปรากฏในส่วนนี้"
        icon={MessageSquareText}
      />
    );
  }
  return (
    <ObservationRounds
      comments={comments}
      roundStart={latestRoundStart(lastCaseResolvedAt, lastWatchClosedAt)}
    />
  );
}

/**
 * Closing a case starts a new observation round. Observations from before the
 * close stay readable as history, under their own heading so nobody mistakes
 * them for something still waiting on a decision.
 */
interface RoundStart {
  at: string;
  /** What ended the previous round: a closed case or a closed watch. */
  kind: "CASE" | "WATCH";
}

const ROUND_LABELS: Record<
  RoundStart["kind"],
  { current: string; empty: string; history: string; closedAt: string }
> = {
  CASE: {
    current: "ข้อสังเกตหลังปิดเคสล่าสุด",
    empty: "ยังไม่มีข้อสังเกตหลังปิดเคสล่าสุด",
    history: "ประวัติข้อสังเกตก่อนปิดเคส",
    closedAt: "ปิดเคสเมื่อ",
  },
  WATCH: {
    current: "ข้อสังเกตหลังปิดการเฝ้าระวังล่าสุด",
    empty: "ยังไม่มีข้อสังเกตหลังปิดการเฝ้าระวังล่าสุด",
    history: "ประวัติข้อสังเกตก่อนปิดการเฝ้าระวัง",
    closedAt: "ปิดการเฝ้าระวังเมื่อ",
  },
};

function latestRoundStart(
  caseResolvedAt: string | null,
  watchClosedAt: string | null,
): RoundStart | null {
  if (!caseResolvedAt && !watchClosedAt) return null;
  if (!watchClosedAt) return { at: caseResolvedAt as string, kind: "CASE" };
  if (!caseResolvedAt) return { at: watchClosedAt, kind: "WATCH" };
  return new Date(watchClosedAt).getTime() > new Date(caseResolvedAt).getTime()
    ? { at: watchClosedAt, kind: "WATCH" }
    : { at: caseResolvedAt, kind: "CASE" };
}

function ObservationRounds({
  comments,
  roundStart,
}: {
  comments: StudentClassroomComment[];
  roundStart: RoundStart | null;
}) {
  // Unique per instance: the case page and a dialog can both render this.
  const headingId = useId();
  if (!roundStart) return <ObservationList comments={comments} />;

  const labels = ROUND_LABELS[roundStart.kind];
  const resolvedAt = new Date(roundStart.at).getTime();
  const current = comments.filter(
    (comment) => new Date(comment.commentedAt).getTime() > resolvedAt,
  );
  const history = comments.filter(
    (comment) => new Date(comment.commentedAt).getTime() <= resolvedAt,
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${headingId}-current`} className="space-y-3">
        <h3
          id={`${headingId}-current`}
          className="text-sm font-semibold text-slate-800"
        >
          {labels.current}
        </h3>
        {current.length > 0 ? (
          <ObservationList comments={current} />
        ) : (
          <p className="text-sm text-slate-600">{labels.empty}</p>
        )}
      </section>
      {history.length > 0 ? (
        <section aria-labelledby={`${headingId}-history`} className="space-y-3">
          <div>
            <h3
              id={`${headingId}-history`}
              className="text-sm font-semibold text-slate-800"
            >
              {labels.history}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {labels.closedAt} {formatThaiDateTime(roundStart.at)}
            </p>
          </div>
          <ObservationList comments={history} />
        </section>
      ) : null}
    </div>
  );
}

function ObservationList({
  comments,
}: {
  comments: StudentClassroomComment[];
}) {
  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant={
                getConcernLevelPresentation(comment.concernLevelCode).variant
              }
            >
              {comment.concernLevelLabel}
            </Badge>
            <time
              dateTime={comment.commentedAt}
              className="text-xs text-slate-600"
            >
              {formatThaiDateTime(comment.commentedAt)}
            </time>
          </div>
          <h4 className="mt-3 text-sm font-semibold text-slate-800">
            {comment.problemCategoryLabel}
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {comment.problemDescription}
          </p>
          <p className="mt-3 text-xs text-slate-600">
            ผู้บันทึก: {comment.authorDisplayName}
          </p>
        </li>
      ))}
    </ul>
  );
}
