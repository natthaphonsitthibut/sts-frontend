import { ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { useAttendanceSessionDetail } from "../hooks/useAttendanceSessionDetail";
import { AttendanceStudentTable } from "./AttendanceStudentTable";

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
  const detail = useAttendanceSessionDetail({
    schoolId,
    grade,
    room,
    date,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[85vh] max-w-3xl overflow-y-auto"
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle>ตรวจวันที่ {formatThaiDate(date)}</DialogTitle>
          <DialogDescription>
            {grade} / {formatRoomLabel(room)}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
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
  );
}
