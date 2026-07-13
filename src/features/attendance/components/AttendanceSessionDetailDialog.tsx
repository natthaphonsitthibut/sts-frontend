import { useState } from "react";
import { ClipboardList, LockOpen } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import type { BadgeProps } from "../../../components/base";
import { EmptyState, ErrorState, SkeletonTable } from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { useAttendanceSessionDetail } from "../hooks/useAttendanceSessionDetail";
import { AttendanceStudentTable } from "./AttendanceStudentTable";
import { AttendanceReopenDialog } from "./AttendanceReopenDialog";
import type { AttendanceSessionStatus } from "../types/attendance.types";

const SESSION_STATUS_META: Record<
  AttendanceSessionStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  OPEN: { label: "เปิดเช็คชื่อ", variant: "secondary" },
  SUBMITTED: { label: "ส่งการเช็คชื่อแล้ว", variant: "success" },
  REOPENED: { label: "เปิดแก้ไขอยู่", variant: "warning" },
  VOIDED: { label: "ยกเลิกแล้ว", variant: "destructive" },
};

interface AttendanceSessionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  grade: string;
  room: string;
  date: string;
}

export function AttendanceSessionDetailDialog({
  date,
  grade,
  onClose,
  open,
  room,
  schoolId,
}: AttendanceSessionDetailDialogProps) {
  const [reopenOpen, setReopenOpen] = useState(false);
  const detail = useAttendanceSessionDetail({ schoolId, grade, room, date, enabled: open });
  const statusMeta = detail.session ? SESSION_STATUS_META[detail.session.status] : null;

  async function handleReopen(reason: string): Promise<void> {
    await detail.reopen(reason);
    setReopenOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto" onClose={onClose}>
          <DialogHeader>
            <DialogTitle>ตรวจวันที่ {formatThaiDate(date)}</DialogTitle>
            <DialogDescription>{grade} / ห้อง {room}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {detail.session ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {statusMeta ? <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge> : null}
                <span className="text-sm font-semibold text-slate-600">
                  บันทึกแล้ว {detail.session.recordedCount} / {detail.session.expectedRosterCount} คน · รอบ {detail.session.revision}
                </span>
                {detail.session.status === "SUBMITTED" ? (
                  <Button
                    className="ml-auto"
                    icon={LockOpen}
                    onClick={() => setReopenOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    เปิดแก้ไข
                  </Button>
                ) : null}
              </div>
            ) : null}

            {detail.isLoading ? (
              <SkeletonTable rows={5} />
            ) : detail.isError ? (
              <ErrorState title="ไม่สามารถโหลดข้อมูลวันนี้ได้" />
            ) : detail.students.length === 0 ? (
              <EmptyState
                description="ห้องนี้ยังไม่มีรายชื่อนักเรียนในระบบ"
                icon={ClipboardList}
                title="ไม่พบรายชื่อนักเรียนในห้องนี้"
              />
            ) : (
              <AttendanceStudentTable
                disabled
                onStatusChange={() => {}}
                selections={detail.selections}
                students={detail.students}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
      <AttendanceReopenDialog
        error={detail.reopenState.error}
        isPending={detail.reopenState.isPending}
        onClose={() => setReopenOpen(false)}
        onSubmit={handleReopen}
        open={reopenOpen}
      />
    </>
  );
}
