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
import { getConcernLevelPresentation } from "../../teacher-comments/lib/comment-presentation";

export function WatchlistObservationsDialog({
  onClose,
  studentId,
  studentName,
}: {
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
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        getConcernLevelPresentation(comment.concernLevelCode)
                          .variant
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
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    {comment.problemCategoryLabel}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {comment.problemDescription}
                  </p>
                  <p className="mt-3 text-xs text-slate-600">
                    ผู้บันทึก: {comment.authorDisplayName}
                  </p>
                </li>
              ))}
            </ul>
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
