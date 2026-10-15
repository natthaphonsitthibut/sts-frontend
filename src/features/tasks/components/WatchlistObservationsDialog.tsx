import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { StudentObservationHistory } from "../../teacher-comments/components/StudentObservationHistory";

export function WatchlistObservationsDialog({
  lastCaseResolvedAt,
  lastWatchClosedAt = null,
  onClose,
  studentId,
  studentName,
}: {
  lastCaseResolvedAt: string | null;
  /** A watch closed without a case starts a new round, like a closed case. */
  lastWatchClosedAt?: string | null;
  onClose: () => void;
  studentId: string;
  studentName: string;
}) {
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
          <StudentObservationHistory
            lastCaseResolvedAt={lastCaseResolvedAt}
            lastWatchClosedAt={lastWatchClosedAt}
            studentId={studentId}
          />
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
