import { MessageSquareText } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useStudentClassroomComments } from "../../school-structure/hooks/useSchoolStructure";
import type { StudentClassroomComment } from "../../school-structure/types/school-structure.types";
import { getConcernLevelPresentation } from "../../teacher-comments/lib/comment-presentation";

export function WatchlistObservationsDialog({
  lastCaseResolvedAt,
  onClose,
  studentId,
  studentName,
}: {
  lastCaseResolvedAt: string | null;
  onClose: () => void;
  studentId: string;
  studentName: string;
}) {
  const commentsQuery = useStudentClassroomComments(studentId);
  const comments = commentsQuery.data?.data ?? [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex h-[min(80dvh,40rem)] max-w-2xl flex-col overflow-hidden text-left"
        onClose={onClose}
        aria-labelledby="watchlist-observations-title"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle id="watchlist-observations-title">
            ข้อสังเกตทั้งหมด
          </DialogTitle>
          <DialogDescription>
            {studentName} · อ่านข้อสังเกตเพื่อประกอบการพิจารณาเปิดเคส
          </DialogDescription>
        </DialogHeader>
        <DialogBody
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
          role="region"
          aria-label="รายการข้อสังเกต"
          tabIndex={0}
        >
          {commentsQuery.isLoading ? (
            <SkeletonStack lines={3} />
          ) : commentsQuery.isError ? (
            <ErrorState
              title="โหลดข้อสังเกตไม่สำเร็จ"
              description="กรุณาลองใหม่อีกครั้ง"
              onRetry={() => void commentsQuery.refetch()}
            />
          ) : comments.length === 0 ? (
            <EmptyState
              title="ยังไม่มีข้อสังเกต"
              description="ข้อสังเกตที่ครูบันทึกจะปรากฏในส่วนนี้"
              icon={MessageSquareText}
            />
          ) : (
            <ObservationRounds
              comments={comments}
              lastCaseResolvedAt={lastCaseResolvedAt}
            />
          )}
        </DialogBody>
        <DialogFooter className="shrink-0">
          <Button onClick={onClose} variant="outline">
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Closing a case starts a new observation round. Observations from before the
 * close stay readable as history, under their own heading so nobody mistakes
 * them for something still waiting on a decision.
 */
function ObservationRounds({
  comments,
  lastCaseResolvedAt,
}: {
  comments: StudentClassroomComment[];
  lastCaseResolvedAt: string | null;
}) {
  if (!lastCaseResolvedAt) return <ObservationList comments={comments} />;

  const resolvedAt = new Date(lastCaseResolvedAt).getTime();
  const current = comments.filter(
    (comment) => new Date(comment.commentedAt).getTime() > resolvedAt,
  );
  const history = comments.filter(
    (comment) => new Date(comment.commentedAt).getTime() <= resolvedAt,
  );

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="observations-current-round"
        className="space-y-3"
      >
        <h3
          id="observations-current-round"
          className="text-sm font-semibold text-slate-800"
        >
          ข้อสังเกตหลังปิดเคสล่าสุด
        </h3>
        {current.length > 0 ? (
          <ObservationList comments={current} />
        ) : (
          <p className="text-sm text-slate-600">
            ยังไม่มีข้อสังเกตหลังปิดเคสล่าสุด
          </p>
        )}
      </section>
      {history.length > 0 ? (
        <section aria-labelledby="observations-history" className="space-y-3">
          <div>
            <h3
              id="observations-history"
              className="text-sm font-semibold text-slate-800"
            >
              ประวัติข้อสังเกตก่อนปิดเคส
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              ปิดเคสเมื่อ {formatThaiDateTime(lastCaseResolvedAt)}
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
