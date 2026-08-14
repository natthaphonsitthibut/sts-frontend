import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  DatePicker,
  FormErrorAlert,
  Input,
  Textarea,
  TimePicker,
  useConfirm,
} from "../../../components/base";
import { appToast } from "../../../components/base/app-toast";
import { AssignmentSummary } from "../../../components/layout/assignment-summary";
import { TrackingStep, TrackingStepsCard } from "../../../components/layout/tracking-step";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { taskService } from "../../tasks/api/task.service";
import type { TaskCreatePayload } from "../../tasks/types/task.types";
import { VisitAttachments } from "./CaseFollowUpRoundDetails";
import { getCaseTrackingStatusPresentation, isFollowUpLinkExpired } from "../lib/case-presentation";
import type { CaseFollowUpRound, CaseRecord, CaseReviewAction } from "../types/cases.types";

interface CaseTrackingTimelineProps {
  caseRecord: CaseRecord;
  onReview: (action: CaseReviewAction) => void;
  onAssigned: () => void;
}

interface AssignmentFormValues {
  startsOn: string;
  startsAt: string;
  endsOn: string;
  endsAt: string;
  teacherUserId: string;
  note: string;
}

type AssignmentField = "startsOn" | "startsAt" | "endsOn" | "endsAt" | "teacherUserId";
type AssignmentFieldErrors = Partial<Record<AssignmentField, true>>;

function createAssignmentDefaults(): AssignmentFormValues {
  const dateTimeParts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(
    dateTimeParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    startsOn: `${parts.year}-${parts.month}-${parts.day}`,
    startsAt: `${parts.hour}:${parts.minute}`,
    endsOn: "",
    endsAt: "",
    teacherUserId: "",
    note: "",
  };
}

function readOnlyDate(value: string | null | undefined): string {
  return value ? formatThaiDate(value) : "-";
}

function readOnlyTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

function AssignmentForm({
  caseRecord,
  onAssigned,
}: {
  caseRecord: CaseRecord;
  onAssigned: () => void;
}) {
  const [values, setValues] = useState<AssignmentFormValues>(createAssignmentDefaults);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AssignmentFieldErrors>({});
  const { confirm, dialog: confirmDialog } = useConfirm();
  const assigneesQuery = useQuery({
    queryKey: ["visit-assignees", caseRecord.student_id],
    queryFn: () => taskService.getVisitAssignees(caseRecord.student_id!),
    enabled: Boolean(caseRecord.student_id),
  });
  const assignees = useMemo(() => assigneesQuery.data ?? [], [assigneesQuery.data]);
  const defaultTeacher = assignees.find((teacher) => teacher.isHomeroom);
  const selectedTeacherUserId = values.teacherUserId || (defaultTeacher ? String(defaultTeacher.teacherUserId) : "");

  const createAssignment = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: () => {
      appToast.success("มอบหมายติดตามนักเรียนแล้ว");
      onAssigned();
    },
  });

  function updateField<Key extends keyof AssignmentFormValues>(key: Key, value: AssignmentFormValues[Key]): void {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
    setFormError(null);
  }

  function validate(): string | null {
    const missing: Array<{ field: AssignmentField; label: string }> = [
      !values.startsOn ? { field: "startsOn", label: "วันที่เริ่ม" } : null,
      !values.startsAt ? { field: "startsAt", label: "เวลาเริ่ม" } : null,
      !values.endsOn ? { field: "endsOn", label: "วันที่สิ้นสุด" } : null,
      !values.endsAt ? { field: "endsAt", label: "เวลาสิ้นสุด" } : null,
      !selectedTeacherUserId ? { field: "teacherUserId", label: "ครูผู้ได้รับมอบหมาย" } : null,
    ].filter((item): item is { field: AssignmentField; label: string } => item !== null);
    if (missing.length > 0) {
      setFieldErrors(Object.fromEntries(missing.map((item) => [item.field, true])));
      return `กรุณาระบุ ${missing.map((item) => item.label).join(", ")}`;
    }
    if (toIsoDateTime(values.endsOn, values.endsAt) <= toIsoDateTime(values.startsOn, values.startsAt)) {
      setFieldErrors({ endsOn: true, endsAt: true });
      return "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";
    }
    setFieldErrors({});
    return null;
  }

  async function handleAssign(): Promise<void> {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    const confirmed = await confirm({
      title: "ยืนยันการมอบหมาย",
      description: "คุณต้องการมอบหมายการติดตามนักเรียนใช่หรือไม่",
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;

    createAssignment.mutate({
      task_type: "VISIT",
      type: "VISIT",
      assigned_to_name: "",
      assigned_to_first_name: "",
      assigned_to_last_name: "",
      assigned_teacher_user_id: Number(selectedTeacherUserId),
      expires_value: 1,
      expires_unit: "days",
      opens_at: toIsoDateTime(values.startsOn, values.startsAt),
      expires_at: toIsoDateTime(values.endsOn, values.endsAt),
      existing_case_id: String(caseRecord.id),
      student_id: caseRecord.student_id ?? null,
      student_name: caseRecord.student_name,
      student_school: caseRecord.student_school ?? null,
      student_address: caseRecord.student_address ?? null,
      target_school_id: caseRecord.school_id ?? null,
      reason_flagged: caseRecord.reason_flagged ?? null,
      assignment_note: values.note.trim() || null,
    });
  }

  return (
    <>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            วันที่เริ่ม <span className="text-danger">*</span>
            <DatePicker aria-invalid={Boolean(fieldErrors.startsOn)} ariaLabel="วันที่เริ่มมอบหมาย" onChange={(value) => updateField("startsOn", value)} value={values.startsOn} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            เวลาเริ่ม <span className="text-danger">*</span>
            <TimePicker aria-invalid={Boolean(fieldErrors.startsAt)} ariaLabel="เวลาเริ่มมอบหมาย" onChange={(value) => updateField("startsAt", value)} value={values.startsAt} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            วันที่สิ้นสุด <span className="text-danger">*</span>
            <DatePicker aria-invalid={Boolean(fieldErrors.endsOn)} ariaLabel="วันที่สิ้นสุดมอบหมาย" onChange={(value) => updateField("endsOn", value)} placeholder="เลือกวันที่" value={values.endsOn} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            เวลาสิ้นสุด <span className="text-danger">*</span>
            <TimePicker aria-invalid={Boolean(fieldErrors.endsAt)} ariaLabel="เวลาสิ้นสุดมอบหมาย" onChange={(value) => updateField("endsAt", value)} value={values.endsAt} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
            คุณครูที่ได้รับมอบหมาย <span className="text-danger">*</span>
            <Combobox
              disabled={!caseRecord.student_id}
              ariaLabel="ครูผู้ได้รับมอบหมาย"
              aria-invalid={Boolean(fieldErrors.teacherUserId)}
              emptyText={
                assigneesQuery.isLoading
                  ? "กำลังโหลดรายชื่อครู…"
                  : assigneesQuery.isError
                    ? "โหลดรายชื่อครูไม่สำเร็จ"
                    : "ไม่พบครูที่พร้อมรับมอบหมายในโรงเรียนนี้"
              }
              onChange={(value) => updateField("teacherUserId", value)}
              options={assignees.map((teacher) => ({
                value: String(teacher.teacherUserId),
                label: `${teacher.displayName}${teacher.isHomeroom ? " (ครูประจำชั้น)" : ""}`,
              }))}
              placeholder={caseRecord.student_id ? "เลือกครูผู้ได้รับมอบหมาย" : "ไม่พบข้อมูลนักเรียน"}
              value={selectedTeacherUserId}
            />
          </label>
        </div>
        <label className="flex min-h-0 flex-col gap-1 text-sm font-medium text-slate-700">
          คำอธิบายเพิ่มเติม
          <Textarea
            className="min-h-0 flex-1 resize-none overflow-y-auto"
            maxLength={2000}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="คำอธิบาย"
            value={values.note}
          />
        </label>
      </div>
      <FormErrorAlert
        className="mt-3"
        error={formError ? new Error(formError) : createAssignment.error || assigneesQuery.error}
        fallback={assigneesQuery.error ? "ไม่สามารถโหลดรายชื่อครูได้ กรุณาลองอีกครั้ง" : "ไม่สามารถมอบหมายการติดตามได้ กรุณาลองอีกครั้ง"}
      />
      <div className="mt-4 flex flex-wrap justify-end">
        <Button isLoading={createAssignment.isPending} loadingText="กำลังมอบหมาย" onClick={() => void handleAssign()} type="button">มอบหมาย</Button>
      </div>
      {confirmDialog}
    </>
  );
}

function ReadOnlyAssignment({ round }: { round: CaseFollowUpRound | undefined }) {
  const startsAt = round?.assignment_starts_at ?? round?.created_at;
  const endsAt = round?.assignment_ends_at;
  return (
    <AssignmentSummary
      assigneeLabel={round?.initial_assignee || "-"}
      endsAtLabel={readOnlyTime(endsAt)}
      endsOnLabel={readOnlyDate(endsAt)}
      note={round?.assignment_note || ""}
      startsAtLabel={readOnlyTime(startsAt)}
      startsOnLabel={readOnlyDate(startsAt)}
    />
  );
}

export function CaseTrackingTimeline({ caseRecord, onAssigned, onReview }: CaseTrackingTimelineProps) {
  const [manualReassign, setManualReassign] = useState(false);
  const { can } = usePermissions();
  const canAssign = can("create");
  const latestRound = caseRecord.follow_up_rounds?.at(-1);
  const hasSubmission = Boolean(latestRound?.submitted_at);
  const reviewReady = caseRecord.status === "PENDING_REVIEW";
  const finished = caseRecord.status === "RESOLVED";
  const openForAssignment = caseRecord.status === "OPEN";
  const studentNotFound = caseRecord.status === "STUDENT_NOT_FOUND";
  const needsReassignment =
    caseRecord.status === "IN_PROGRESS" && !hasSubmission && isFollowUpLinkExpired(latestRound?.assignment_ends_at);
  const showAssignmentForm = openForAssignment || needsReassignment || (studentNotFound && manualReassign);
  const statusPresentation = getCaseTrackingStatusPresentation(caseRecord.status);

  return (
    <TrackingStepsCard
      statusClassName={statusPresentation.textClassName}
      statusLabel={caseRecord.display_status_label || caseRecord.status_label || statusPresentation.label}
    >
      <TrackingStep active={openForAssignment || (!hasSubmission && !finished) || showAssignmentForm} connectNext={hasSubmission || reviewReady || finished} number={1} title="มอบหมาย">
        {needsReassignment ? (
          <Alert className="mb-4" variant="warning">
            <AlertDescription>ลิงก์เดิมหมดอายุแล้วโดยยังไม่มีการส่งรายงาน กรุณามอบหมายใหม่</AlertDescription>
          </Alert>
        ) : null}
        {showAssignmentForm && canAssign ? (
          <AssignmentForm caseRecord={caseRecord} onAssigned={onAssigned} />
        ) : showAssignmentForm ? (
          <Alert variant="warning">
            <AlertDescription>บัญชีนี้ไม่มีสิทธิ์มอบหมายการติดตามนักเรียน</AlertDescription>
          </Alert>
        ) : (
          <>
            <ReadOnlyAssignment round={latestRound} />
            {studentNotFound && canAssign ? (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setManualReassign(true)} type="button" variant="outline">
                  มอบหมายอีกครั้ง
                </Button>
              </div>
            ) : null}
          </>
        )}
      </TrackingStep>

      {hasSubmission || reviewReady || finished ? (
        <TrackingStep active={reviewReady} connectPrev number={2} title="สาเหตุ">
          <div className="grid items-stretch gap-3 lg:grid-cols-2">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">วันที่ลงพื้นที่<Input disabled value={readOnlyDate(latestRound?.visited_at ?? latestRound?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">เวลาที่ลงพื้นที่<Input disabled value={readOnlyTime(latestRound?.visited_at ?? latestRound?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">ผลการติดตาม<Input disabled value={latestRound?.follow_up_assessment_label || latestRound?.cause_category || "-"} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">คำอธิบายเพิ่มเติม<Textarea className="resize-none overflow-y-auto" disabled rows={4} value={latestRound?.cause_detail || ""} /></label>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">แนบไฟล์</span>
              <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <VisitAttachments emptyLabel="ไม่มีไฟล์แนบ" value={latestRound?.photo_paths} />
              </div>
            </div>
          </div>
          {reviewReady ? (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {can("review-cases") ? (
                <Button onClick={() => onReview("REFER_AGENCY")} type="button" variant="outline">ส่งต่อหน่วยงาน</Button>
              ) : null}
              {can("close-case") ? (
                <Button onClick={() => onReview("CLOSE")} type="button">ปิดเคส</Button>
              ) : null}
            </div>
          ) : null}
        </TrackingStep>
      ) : null}

      {latestRound?.submitted_at ? <p className="text-xs text-slate-500">อัปเดตล่าสุด {formatThaiDateTime(latestRound.submitted_at)}</p> : null}
    </TrackingStepsCard>
  );
}
