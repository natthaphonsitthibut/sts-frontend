import { useMemo, useState } from "react";
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
import {
  useIssueTeacherAttendanceDelegation,
  useIssuePublicTeacherAttendanceDelegation,
  usePublicTeacherAttendanceDelegationOptions,
  useTeacherAttendanceDelegationOptions,
} from "../../teacher-access/hooks/useTeacherAccess";
import type { TeacherLinkCredential } from "../../teacher-access/store/teacher-link-session.store";

/** Today in Bangkok, the day a link always starts on. */
function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );
}

function getCurrentTime(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.hour ?? "00"}:${values.minute ?? "00"}`;
}

interface AttendanceDelegationDialogProps {
  classroomId?: number;
  credential?: TeacherLinkCredential;
  defaultAssignmentId?: number;
  defaultSubjectId?: number;
  /** The period the screen is already filtered to, preselected in the form. */
  defaultTimetableSlotId?: number;
  initialAttendanceDate: string;
  onCreated: (input: { accessUrl: string; description: string }) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  schoolId?: number;
  schoolTermId?: number;
}

export function AttendanceDelegationDialog({
  classroomId,
  credential,
  defaultAssignmentId,
  defaultSubjectId,
  defaultTimetableSlotId,
  initialAttendanceDate,
  onCreated,
  onOpenChange,
  open,
  schoolId,
  schoolTermId,
}: AttendanceDelegationDialogProps) {
  // The round is the one the screen is already showing, so it is read back
  // rather than picked again — that keeps the delegation, the roster and the
  // reopen rules all talking about the same day.
  const attendanceDate = initialAttendanceDate;
  // The link is usable the moment it is issued, so its start is shown but not
  // editable; only its expiry is a choice, and it is a choice about the link,
  // not about the round being checked.
  const startsOn = getTodayIso();
  const startsAt = getCurrentTime();
  const [endsOn, setEndsOn] = useState(getTodayIso);
  const [endsAt, setEndsAt] = useState("");
  const [teacherMembershipId, setTeacherMembershipId] = useState("");
  const [selectedOptionKey, setSelectedOptionKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const optionsQuery = useTeacherAttendanceDelegationOptions({
    schoolId,
    schoolTermId,
    classroomId,
    attendanceDate,
    enabled: !credential,
  });
  const publicOptionsQuery = usePublicTeacherAttendanceDelegationOptions(
    credential,
    { assignmentId: defaultAssignmentId, attendanceDate },
    Boolean(credential),
  );
  const issueDelegation = useIssueTeacherAttendanceDelegation();
  const issuePublicDelegation =
    useIssuePublicTeacherAttendanceDelegation(credential);
  const activeOptionsQuery = credential ? publicOptionsQuery : optionsQuery;
  const assignments = useMemo(
    () => activeOptionsQuery.data?.assignments ?? [],
    [activeOptionsQuery.data?.assignments],
  );
  const teachers = useMemo(
    () => activeOptionsQuery.data?.teachers ?? [],
    [activeOptionsQuery.data?.teachers],
  );
  // โฮมรูม is a subject on the timetable like any other, so the standalone
  // HOMEROOM assignment is not delegated on its own — a day with no periods has
  // nothing to hand over, and the form has to say so instead of offering a
  // daily round that the school no longer checks.
  const delegatableAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.assignmentKind === "SUBJECT" &&
          assignment.timetableSlotId !== null,
      ),
    [assignments],
  );

  // Whatever the screen is filtered to is what the teacher means to delegate, so
  // the picker opens on that period until they choose another one.
  const preselectedOptionKey = useMemo(() => {
    const preselected =
      delegatableAssignments.find(
        (assignment) =>
          defaultTimetableSlotId !== undefined &&
          assignment.timetableSlotId === defaultTimetableSlotId,
      ) ??
      (defaultAssignmentId
        ? delegatableAssignments.find(
            (assignment) => assignment.id === defaultAssignmentId,
          )
        : undefined);
    return preselected
      ? `${preselected.id}:${preselected.timetableSlotId}`
      : "";
  }, [defaultAssignmentId, defaultTimetableSlotId, delegatableAssignments]);
  const activeOptionKey = selectedOptionKey || preselectedOptionKey;
  const selectedAssignment =
    delegatableAssignments.find(
      (item) => `${item.id}:${item.timetableSlotId}` === activeOptionKey,
    ) ??
    ((defaultAssignmentId
      ? delegatableAssignments.filter((item) => item.id === defaultAssignmentId)
      : defaultSubjectId
        ? delegatableAssignments.filter(
            (item) => item.subjectId === defaultSubjectId,
          )
        : delegatableAssignments
    ).length === 1
      ? (defaultAssignmentId
          ? delegatableAssignments.filter(
              (item) => item.id === defaultAssignmentId,
            )
          : defaultSubjectId
            ? delegatableAssignments.filter(
                (item) => item.subjectId === defaultSubjectId,
              )
            : delegatableAssignments)[0]
      : undefined);
  const resolvedAssignmentId = selectedAssignment
    ? String(selectedAssignment.id)
    : "";
  const selectedAssignmentLabel = `${selectedAssignment?.subjectName ?? "รายวิชา"}${selectedAssignment?.period ? ` · คาบ ${selectedAssignment.period}` : ""}`;
  const assignmentOptions = useMemo(
    () =>
      delegatableAssignments
        .slice()
        .sort((left, right) => (left.period ?? 99) - (right.period ?? 99))
        .map((assignment) => ({
          value: `${assignment.id}:${assignment.timetableSlotId}`,
          label: `${assignment.subjectName ?? "รายวิชา"}${assignment.period ? ` · คาบ ${assignment.period}` : ""}`,
        })),
    [delegatableAssignments],
  );

  const canSubmit = Boolean(
    schoolId &&
    schoolTermId &&
    classroomId &&
    teacherMembershipId &&
    resolvedAssignmentId &&
    selectedAssignment?.timetableSlotId &&
    attendanceDate &&
    endsOn &&
    endsAt,
  );
  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: String(teacher.teacherMembershipId),
        label: teacher.teacherDisplayName,
      })),
    [teachers],
  );

  async function submit(): Promise<void> {
    if (!canSubmit || !schoolId || !schoolTermId || !classroomId) return;
    if (`${endsOn}T${endsAt}` <= `${startsOn}T${startsAt}`) {
      setFormError("วันและเวลาที่ลิงก์หมดอายุต้องอยู่หลังเวลาที่เริ่มใช้ลิงก์");
      return;
    }
    try {
      const input = {
        teacherMembershipId: Number(teacherMembershipId),
        assignmentId: Number(resolvedAssignmentId),
        timetableSlotId: selectedAssignment!.timetableSlotId!,
        attendanceDate,
        endsOn,
        endsAt,
      };
      const result = credential
        ? await issuePublicDelegation.mutateAsync(input)
        : await issueDelegation.mutateAsync({
            schoolId,
            schoolTermId,
            ...input,
          });
      if (!result.accessUrl) throw new Error("ไม่พบลิงก์ที่สร้างแล้ว");
      const teacherName =
        teachers.find(
          (teacher) =>
            String(teacher.teacherMembershipId) === teacherMembershipId,
        )?.teacherDisplayName ?? "ครูผู้ได้รับมอบหมาย";
      onOpenChange(false);
      onCreated({
        accessUrl: result.accessUrl,
        description: `${teacherName} · ${selectedAssignmentLabel} · ${attendanceDate} · ลิงก์ถึง ${endsOn} ${endsAt} น.`,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error, "ไม่สามารถมอบหมายการเช็กชื่อได้"));
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle icon={ClipboardCheck}>มอบหมายการเช็กชื่อ</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            วันที่เช็กชื่อ <span className="text-danger">*</span>
            <DatePicker
              ariaLabel="วันที่เช็กชื่อ"
              disabled
              onChange={() => undefined}
              value={attendanceDate}
            />
          </label>
          {/* The link's own validity, which is not the round's date: a round
              from an earlier day is still checked through a link that starts
              now. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              ลิงก์เริ่มใช้ได้
              <DatePicker
                ariaLabel="วันที่ลิงก์เริ่มใช้ได้"
                disabled
                onChange={() => undefined}
                value={startsOn}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              เวลาเริ่มต้น
              <TimePicker
                ariaLabel="เวลาที่ลิงก์เริ่มใช้ได้"
                disabled
                onChange={() => undefined}
                value={startsAt}
              />
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
                onChange={setEndsAt}
                value={endsAt}
              />
            </label>
          </div>
          {/* Kept on screen when the day has nothing to delegate: a field that
              silently disappears reads as a broken form, not as an answer. */}
          {delegatableAssignments.length > 1 ? (
            <div className="space-y-1">
              <Label htmlFor="attendance-delegation-assignment">
                วิชาและคาบที่มอบหมาย <span className="text-danger">*</span>
              </Label>
              <Combobox
                ariaLabel="วิชาและคาบที่มอบหมาย"
                disabled={
                  activeOptionsQuery.isLoading || activeOptionsQuery.isError
                }
                emptyText="ไม่พบวิชาหรือคาบที่มอบหมายได้"
                id="attendance-delegation-assignment"
                onChange={(value) => {
                  setSelectedOptionKey(value);
                  setFormError(null);
                }}
                options={assignmentOptions}
                placeholder="เลือกวิชาและคาบ"
                value={activeOptionKey}
              />
            </div>
          ) : delegatableAssignments.length === 0 &&
            !activeOptionsQuery.isLoading &&
            !activeOptionsQuery.isError ? (
            /* Nothing to delegate that day — say so, instead of leaving the
               form looking like a field went missing. */
            <Alert variant="warning">
              <AlertDescription>
                วันที่เลือกไม่มีคาบเรียนของห้องนี้ กรุณาเลือกวันอื่น
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="attendance-delegation-teacher">
              คุณครูที่ได้รับมอบหมาย <span className="text-danger">*</span>
            </Label>
            <Combobox
              ariaLabel="ครูผู้ได้รับมอบหมาย"
              disabled={
                activeOptionsQuery.isLoading || activeOptionsQuery.isError
              }
              emptyText={
                activeOptionsQuery.isLoading
                  ? "กำลังโหลดรายชื่อครู…"
                  : "ไม่พบครูในโรงเรียนนี้"
              }
              id="attendance-delegation-teacher"
              onChange={setTeacherMembershipId}
              options={teacherOptions}
              placeholder="เลือกครูที่ได้รับมอบหมาย"
              value={teacherMembershipId}
            />
          </div>
          {formError || activeOptionsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {formError ??
                  "ไม่สามารถโหลดห้องเรียน รายวิชา หรือรายชื่อครูได้"}
              </AlertDescription>
            </Alert>
          ) : null}
        </DialogBody>
        <DialogFooter className="mt-6 sm:grid sm:grid-cols-2 sm:[&>button]:w-full">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="secondary"
          >
            ยกเลิก
          </Button>
          <Button
            disabled={!canSubmit}
            isLoading={
              issueDelegation.isPending || issuePublicDelegation.isPending
            }
            loadingText="กำลังบันทึก"
            onClick={() => void submit()}
            type="button"
          >
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
