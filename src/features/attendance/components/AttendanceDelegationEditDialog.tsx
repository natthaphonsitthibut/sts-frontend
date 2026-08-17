import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  TimePicker,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";

/** What every screen already knows about the delegation it is editing. */
export interface AttendanceDelegationEditTarget {
  attendanceDate: string;
  endsAt: string;
  grantId: string;
  startsAt: string;
  teacherDisplayName: string;
  teacherMembershipId: number;
}

interface AttendanceDelegationEditDialogProps<T extends AttendanceDelegationEditTarget> {
  delegation: T | null;
  isTeachersLoading?: boolean;
  onClose: () => void;
  /** Saves the new window and then hands the link over — one action, one button. */
  onSaveAndShare: (
    delegation: T,
    input: { endsOn: string; endsAt: string; teacherMembershipId: number },
  ) => Promise<void>;
  /** Who the round can be handed to, from the same options the issue form uses. */
  teachers: readonly { teacherMembershipId: number; teacherDisplayName: string }[];
}

/** Timestamps arrive from the API; the pickers work in Bangkok wall-clock time. */
function toDate(value: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function toTime(value: string): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).formatToParts(new Date(value));
  const result = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${result.hour ?? "00"}:${result.minute ?? "00"}`;
}

/**
 * แก้ไขการมอบหมายการเช็กชื่อ — the same dialog wherever a delegation is edited,
 * so the check-in page, the teacher link and the delegation history all show one
 * form. The date is the round the link was issued for and cannot move, but the
 * window and the teacher holding it can — handing it to someone else closes the
 * old link and answers with the new one, which is why saving ends on the share
 * sheet the way issuing a delegation does.
 */
export function AttendanceDelegationEditDialog<T extends AttendanceDelegationEditTarget>({
  delegation,
  isTeachersLoading = false,
  onClose,
  onSaveAndShare,
  teachers,
}: AttendanceDelegationEditDialogProps<T>) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(delegation)}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <DialogHeader>
          <DialogTitle icon={ClipboardCheck}>มอบหมายการเช็กชื่อ</DialogTitle>
        </DialogHeader>
        {delegation ? (
          /* Keyed on the row, so opening another delegation starts from that
             delegation's own window rather than the previous one's. */
          <AttendanceDelegationEditForm
            delegation={delegation}
            isTeachersLoading={isTeachersLoading}
            key={delegation.grantId}
            onClose={onClose}
            onSaveAndShare={onSaveAndShare}
            teachers={teachers}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDelegationEditForm<T extends AttendanceDelegationEditTarget>({
  delegation,
  isTeachersLoading,
  onClose,
  onSaveAndShare,
  teachers,
}: AttendanceDelegationEditDialogProps<T> & { delegation: T; isTeachersLoading: boolean }) {
  const startsOn = toDate(delegation.startsAt);
  const startsAt = toTime(delegation.startsAt);
  const [endsOn, setEndsOn] = useState(() => toDate(delegation.endsAt));
  const [endsAt, setEndsAt] = useState(() => toTime(delegation.endsAt));
  const [teacherMembershipId, setTeacherMembershipId] = useState(
    () => String(delegation.teacherMembershipId),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // The teacher who already holds the link stays selectable even when the
  // options call has not answered yet, so the field is never blank.
  const teacherOptions = [
    ...(teachers.some(
      (teacher) => teacher.teacherMembershipId === delegation.teacherMembershipId,
    )
      ? []
      : [
          {
            value: String(delegation.teacherMembershipId),
            label: delegation.teacherDisplayName,
          },
        ]),
    ...teachers.map((teacher) => ({
      value: String(teacher.teacherMembershipId),
      label: teacher.teacherDisplayName,
    })),
  ];

  async function saveAndShare(): Promise<void> {
    if (!endsOn || !endsAt || !teacherMembershipId) return;
    if (`${endsOn}T${endsAt}` <= `${startsOn}T${startsAt}`) {
      setFormError("วันและเวลาที่ลิงก์หมดอายุต้องอยู่หลังเวลาที่เริ่มใช้ลิงก์");
      return;
    }
    setIsSaving(true);
    try {
      await onSaveAndShare(delegation, {
        endsOn,
        endsAt,
        teacherMembershipId: Number(teacherMembershipId),
      });
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "ไม่สามารถแก้ไขลิงก์มอบหมายได้"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DialogBody className="space-y-4">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            วันที่เช็กชื่อ <span className="text-danger">*</span>
            <DatePicker
              ariaLabel="วันที่เช็กชื่อ"
              disabled
              onChange={() => undefined}
              value={delegation.attendanceDate}
            />
          </label>
          {/* The link has been usable since it was handed out, so only its
              expiry can move. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              ลิงก์เริ่มใช้ได้
              <DatePicker ariaLabel="วันที่ลิงก์เริ่มใช้ได้" disabled onChange={() => undefined} value={startsOn} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              เวลาเริ่มต้น
              <TimePicker ariaLabel="เวลาที่ลิงก์เริ่มใช้ได้" disabled onChange={() => undefined} value={startsAt} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              ลิงก์หมดอายุ <span className="text-danger">*</span>
              <DatePicker
                ariaLabel="วันที่ลิงก์หมดอายุ"
                onChange={(value) => {
                  setEndsOn(value);
                  setFormError(null);
                }}
                value={endsOn}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              เวลาสิ้นสุด <span className="text-danger">*</span>
              <TimePicker
                ariaLabel="เวลาที่ลิงก์หมดอายุ"
                onChange={(value) => {
                  setEndsAt(value);
                  setFormError(null);
                }}
                value={endsAt}
              />
            </label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="attendance-delegation-edit-teacher">
              คุณครูที่ได้รับมอบหมาย <span className="text-danger">*</span>
            </Label>
            <Combobox
              ariaLabel="ครูผู้ได้รับมอบหมาย"
              emptyText={isTeachersLoading ? "กำลังโหลดรายชื่อครู…" : "ไม่พบครูในโรงเรียนนี้"}
              id="attendance-delegation-edit-teacher"
              onChange={(value) => {
                setTeacherMembershipId(value);
                setFormError(null);
              }}
              options={teacherOptions}
              placeholder="เลือกครูที่ได้รับมอบหมาย"
              value={teacherMembershipId}
            />
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
        </DialogBody>
      <DialogFooter className="mt-6 sm:grid sm:grid-cols-2 sm:[&>button]:w-full">
          <Button onClick={onClose} type="button" variant="secondary">
            ยกเลิก
          </Button>
          <Button
            disabled={!endsOn || !endsAt || !teacherMembershipId}
            isLoading={isSaving}
            loadingText="กำลังบันทึก"
            onClick={() => void saveAndShare()}
            type="button"
          >
            บันทึกข้อมูล
          </Button>
      </DialogFooter>
    </>
  );
}
