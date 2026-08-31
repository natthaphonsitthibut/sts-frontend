import { useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  Button,
  DateTimePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  Label,
} from "../../../components/base";
import type { AttendanceAssignmentPayload } from "../types/classroom-links.types";

interface AttendanceAssignmentDialogProps {
  /** The room being handed over — the one the workspace is already on. */
  classroom: { id: number; label: string };
  /**
   * The lesson being handed on — the one the workspace is already checking. It
   * is not a choice: whoever is standing here opened this subject's roster, and
   * asking again would offer them lessons they did not come to hand on.
   */
  subject: { classroomSubjectId: number; nameTh: string };
  error: unknown;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (
    input: Omit<AttendanceAssignmentPayload, "schoolId" | "schoolTermId">,
  ) => void;
  open: boolean;
}

/** `<input type="datetime-local">` wants local wall-clock, not an ISO instant. */
function toLocalDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Now until a week out — the same opening offer the LINE invitation makes. */
function initialSchedule(): { startsAt: string; expiresAt: string } {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + 7 * 86_400_000);
  return {
    startsAt: toLocalDateTimeValue(startsAt),
    expiresAt: toLocalDateTimeValue(expiresAt),
  };
}

/**
 * Hands one classroom's check-in to whoever can cover it, for a window.
 *
 * Same shape as every other link the school issues — a start, an end, and no
 * recipient. Whoever opens it proves they teach here, which is the only thing
 * that actually had to be true; naming a person in advance was the part that
 * made covering an absence require a second round of admin.
 */
export function AttendanceAssignmentDialog({
  classroom,
  subject,
  error,
  isSaving,
  onClose,
  onSubmit,
  open,
}: AttendanceAssignmentDialogProps) {
  const [schedule, setSchedule] = useState(initialSchedule);

  if (!open) return null;

  const invalidRange =
    new Date(schedule.expiresAt) <= new Date(schedule.startsAt);

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle icon={CalendarClock}>มอบหมายการเช็กชื่อ</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            {classroom.label} · {subject.nameTh} ·
            ครูคนใดในโรงเรียนก็รับงานนี้ได้ โดยต้องยืนยันตัวตนก่อนเข้าใช้งาน
          </p>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <FormErrorAlert error={error} fallback="สร้างการมอบหมายไม่สำเร็จ" />
          <div>
            <Label required>วันและเวลาเริ่ม</Label>
            <DateTimePicker
              ariaLabel="วันและเวลาเริ่มมอบหมาย"
              onChange={(startsAt) =>
                setSchedule((current) => ({ ...current, startsAt }))
              }
              value={schedule.startsAt}
            />
          </div>
          <div>
            <Label required>วันและเวลาหมดอายุ</Label>
            <DateTimePicker
              ariaLabel="วันและเวลาหมดอายุของการมอบหมาย"
              min={schedule.startsAt}
              onChange={(expiresAt) =>
                setSchedule((current) => ({ ...current, expiresAt }))
              }
              value={schedule.expiresAt}
            />
          </div>
          {invalidRange ? (
            <p className="text-sm text-danger" role="alert">
              เวลาหมดอายุต้องมาหลังเวลาเริ่ม
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button disabled={isSaving} onClick={onClose} variant="outline">
            ยกเลิก
          </Button>
          <Button
            disabled={invalidRange}
            isLoading={isSaving}
            onClick={() =>
              onSubmit({
                classroomId: classroom.id,
                classroomSubjectId: subject.classroomSubjectId,
                opensAt: new Date(schedule.startsAt).toISOString(),
                expiresAt: new Date(schedule.expiresAt).toISOString(),
              })
            }
          >
            สร้างลิงก์มอบหมาย
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
