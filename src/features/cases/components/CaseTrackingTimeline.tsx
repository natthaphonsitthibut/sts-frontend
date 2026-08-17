import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  DatePicker,
  Divider,
  FormErrorAlert,
  Input,
  MultiSelect,
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
import {
  formatOptionLabels,
  getCaseTrackingStatusPresentation,
  isFollowUpLinkExpired,
} from "../lib/case-presentation";
import { useCaseTrackingOptions } from "../hooks/useCaseTrackingOptions";
import type {
  CaseFollowUpRound,
  CaseRecord,
  CaseReviewAction,
  CaseTrackingOption,
} from "../types/cases.types";

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
  teacherId: string;
  note: string;
}

type AssignmentField = "startsOn" | "startsAt" | "endsOn" | "endsAt" | "teacherId";
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
    // Owner order: the end time opens on the current time like the start time,
    // so only the end date is left for the assigner to pick.
    endsOn: "",
    endsAt: `${parts.hour}:${parts.minute}`,
    teacherId: "",
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

/**
 * Step 1 and step 3 assign the same way — a teacher from the student's school,
 * a window, a note. `taskType` is the only difference: an assistance round also
 * commits to the measures it will deliver, which the report form then shows
 * read-only.
 */
function AssignmentForm({
  caseRecord,
  onAssigned,
  taskType = "VISIT",
}: {
  caseRecord: CaseRecord;
  onAssigned: () => void;
  taskType?: "VISIT" | "ASSIST";
}) {
  const isAssistance = taskType === "ASSIST";
  const trackingOptions = useCaseTrackingOptions();
  const assistanceMeasures = trackingOptions.data?.assistanceMeasures ?? [];
  const [measureCodes, setMeasureCodes] = useState<string[]>([]);
  const [measureDetail, setMeasureDetail] = useState("");
  const measureRequiresDetail = assistanceMeasures.some(
    (measure) => measure.requiresDetail && measureCodes.includes(measure.code),
  );
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
  const selectedTeacherId = values.teacherId || (defaultTeacher ? String(defaultTeacher.teacherId) : "");

  const createAssignment = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: () => {
      appToast.success(isAssistance ? "มอบหมายการช่วยเหลือแล้ว" : "มอบหมายติดตามนักเรียนแล้ว");
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
      !selectedTeacherId ? { field: "teacherId", label: "ครูผู้ได้รับมอบหมาย" } : null,
    ].filter((item): item is { field: AssignmentField; label: string } => item !== null);
    if (missing.length > 0) {
      setFieldErrors(Object.fromEntries(missing.map((item) => [item.field, true])));
      return `กรุณาระบุ ${missing.map((item) => item.label).join(", ")}`;
    }
    if (toIsoDateTime(values.endsOn, values.endsAt) <= toIsoDateTime(values.startsOn, values.startsAt)) {
      setFieldErrors({ endsOn: true, endsAt: true });
      return "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";
    }
    if (isAssistance && measureCodes.length === 0) {
      return "กรุณาเลือกมาตรการการช่วยเหลืออย่างน้อยหนึ่งอย่าง";
    }
    if (isAssistance && measureRequiresDetail && !measureDetail.trim()) {
      return "กรุณาระบุรายละเอียดมาตรการการช่วยเหลือ";
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
      description: isAssistance
        ? "คุณต้องการมอบหมายการให้ความช่วยเหลือใช่หรือไม่"
        : "คุณต้องการมอบหมายการติดตามนักเรียนใช่หรือไม่",
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;

    createAssignment.mutate({
      task_type: taskType,
      type: taskType,
      assistance_measure_codes: isAssistance ? measureCodes : undefined,
      assistance_measure_detail:
        isAssistance && measureRequiresDetail ? measureDetail.trim() : undefined,
      assigned_to_name: "",
      assigned_to_first_name: "",
      assigned_to_last_name: "",
      assigned_teacher_id: Number(selectedTeacherId),
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
              aria-invalid={Boolean(fieldErrors.teacherId)}
              emptyText={
                assigneesQuery.isLoading
                  ? "กำลังโหลดรายชื่อครู…"
                  : assigneesQuery.isError
                    ? "โหลดรายชื่อครูไม่สำเร็จ"
                    : "ไม่พบครูที่พร้อมรับมอบหมายในโรงเรียนนี้"
              }
              onChange={(value) => updateField("teacherId", value)}
              options={assignees.map((teacher) => ({
                value: String(teacher.teacherId),
                label: `${teacher.displayName}${teacher.isHomeroom ? " (ครูประจำชั้น)" : ""}`,
              }))}
              placeholder={caseRecord.student_id ? "เลือกครูผู้ได้รับมอบหมาย" : "ไม่พบข้อมูลนักเรียน"}
              value={selectedTeacherId}
            />
          </label>
          {isAssistance ? (
            <>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                มาตรการการช่วยเหลือ <span className="text-danger">*</span>
                <MultiSelect
                  ariaLabel="มาตรการการช่วยเหลือ"
                  emptyText="ไม่พบมาตรการการช่วยเหลือ"
                  onChange={setMeasureCodes}
                  options={assistanceMeasures.map((measure) => ({
                    value: measure.code,
                    label: measure.label,
                  }))}
                  placeholder="เลือกมาตรการการช่วยเหลือ"
                  singleRow
                  value={measureCodes}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                ระบุมาตรการ {measureRequiresDetail ? <span className="text-danger">*</span> : null}
                <Input
                  disabled={!measureRequiresDetail}
                  maxLength={200}
                  onChange={(event) => setMeasureDetail(event.target.value)}
                  placeholder={measureRequiresDetail ? "ระบุมาตรการการช่วยเหลือ" : "เลือก อื่น ๆ เพื่อระบุ"}
                  value={measureDetail}
                />
              </label>
            </>
          ) : null}
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

/**
 * Buttons come from `case_review_actions`, already filtered to the case's
 * phase, so adding or retiring an action is a data change — not a code change.
 */
function ReviewActions({
  actions,
  can,
  onReview,
}: {
  actions: CaseTrackingOption[];
  can: (permission: string) => boolean;
  onReview: (action: CaseReviewAction) => void;
}) {
  const allowed = actions.filter((action) => can(action.requiredPermission || "dashboard"));
  if (allowed.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {allowed.map((action) => (
        <Button
          key={action.code}
          onClick={() => onReview(action.code as CaseReviewAction)}
          type="button"
          variant={action.code === "CLOSE" ? "default" : "outline"}
        >
          {action.label}
        </Button>
      ))}
    </div>
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
  const canAssign = can("dashboard");
  const trackingOptions = useCaseTrackingOptions();
  const rounds = useMemo(() => caseRecord.follow_up_rounds ?? [], [caseRecord.follow_up_rounds]);
  // Rounds predating the assistance phase carry no task_type; they are follow-ups.
  const followUpRounds = useMemo(
    () => rounds.filter((round) => (round.task_type ?? "VISIT") === "VISIT"),
    [rounds],
  );
  const assistanceRounds = useMemo(
    () => rounds.filter((round) => round.task_type === "ASSIST"),
    [rounds],
  );
  const phase = caseRecord.workflow_phase_code ?? "FOLLOW_UP";
  const inAssistancePhase = phase === "ASSISTANCE";
  const latestFollowUp = followUpRounds.at(-1);
  const latestAssistance = assistanceRounds.at(-1);
  // The active round is whichever phase the case is in — that is what the
  // assignment/expiry logic on steps 1 and 3 has to reason about.
  const latestRound = inAssistancePhase ? latestAssistance : latestFollowUp;
  const hasSubmission = Boolean(latestRound?.submitted_at);
  const hasFollowUpSubmission = Boolean(latestFollowUp?.submitted_at);
  const hasAssistanceSubmission = Boolean(latestAssistance?.submitted_at);
  const reviewReady = caseRecord.status === "PENDING_REVIEW";
  const finished = caseRecord.status === "RESOLVED";
  const openForAssignment = caseRecord.status === "OPEN";
  const studentNotFound = caseRecord.status === "STUDENT_NOT_FOUND";
  const needsReassignment =
    caseRecord.status === "IN_PROGRESS" && !hasSubmission && isFollowUpLinkExpired(latestRound?.assignment_ends_at);
  const showAssignmentForm = openForAssignment || needsReassignment || (studentNotFound && manualReassign);
  const statusPresentation = getCaseTrackingStatusPresentation(caseRecord.status);
  // Which buttons the reviewer gets is data: an action pinned to another phase
  // is not offered, which is what leaves the assistance review with only
  // ปิดเคส and ส่งต่อหน่วยงาน.
  const reviewActions = (trackingOptions.data?.reviewActions ?? []).filter(
    (action) => !action.availablePhaseCode || action.availablePhaseCode === phase,
  );

  return (
    <TrackingStepsCard
      statusClassName={statusPresentation.textClassName}
      statusLabel={caseRecord.display_status_label || caseRecord.status_label || statusPresentation.label}
    >
      <TrackingStep
        active={!inAssistancePhase && (openForAssignment || (!hasSubmission && !finished) || showAssignmentForm)}
        connectNext={hasFollowUpSubmission || reviewReady || finished}
        number={1}
        title="มอบหมายการติดตาม"
      >
        {needsReassignment ? (
          <Alert className="mb-4" variant="warning">
            <AlertDescription>ลิงก์เดิมหมดอายุแล้วโดยยังไม่มีการส่งรายงาน กรุณามอบหมายใหม่</AlertDescription>
          </Alert>
        ) : null}
        {!inAssistancePhase && showAssignmentForm && canAssign ? (
          <AssignmentForm caseRecord={caseRecord} onAssigned={onAssigned} />
        ) : !inAssistancePhase && showAssignmentForm ? (
          <Alert variant="warning">
            <AlertDescription>บัญชีนี้ไม่มีสิทธิ์มอบหมายการติดตามนักเรียน</AlertDescription>
          </Alert>
        ) : (
          <>
            <ReadOnlyAssignment round={latestFollowUp} />
            {!inAssistancePhase && studentNotFound && canAssign ? (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setManualReassign(true)} type="button" variant="outline">
                  มอบหมายอีกครั้ง
                </Button>
              </div>
            ) : null}
          </>
        )}
      </TrackingStep>

      {hasFollowUpSubmission || (reviewReady && !inAssistancePhase) || finished ? (
        <TrackingStep
          active={reviewReady && !inAssistancePhase}
          connectNext={inAssistancePhase}
          connectPrev
          number={2}
          title="ติดตาม"
        >
          {/* Same split as the guest report form: what the visit found about the
              home, a divider, then what the visitor concluded. Each block shares
              its rows across both columns through `grid-rows-subgrid`, so the
              boxes end level without hand-tuned heights. */}
          <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto]">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:row-span-3 lg:grid-rows-subgrid">
              <label className="space-y-1 text-sm font-medium text-slate-700">วันที่ลงพื้นที่<Input disabled value={readOnlyDate(latestFollowUp?.visited_at ?? latestFollowUp?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">เวลาที่ลงพื้นที่<Input disabled value={readOnlyTime(latestFollowUp?.visited_at ?? latestFollowUp?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">สถานะของบิดา-มารดา<Input disabled value={latestFollowUp?.parental_status_label || "-"} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">ผู้ปกครอง<Input disabled value={latestFollowUp?.guardian_type_label || "-"} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">ระบุผู้ปกครอง<Input disabled value={latestFollowUp?.guardian_type_detail || "-"} /></label>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:row-span-3 lg:grid-rows-subgrid">
              <label className="space-y-1 text-sm font-medium text-slate-700">สภาพแวดล้อมรอบที่พัก<Input disabled value={formatOptionLabels(latestFollowUp?.residence_environments)} /></label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 lg:row-span-2">รายละเอียดสภาพแวดล้อมรอบที่พัก<Textarea className="min-h-24 flex-1 resize-none overflow-y-auto" disabled rows={3} value={latestFollowUp?.residence_environment_detail || ""} /></label>
            </div>
          </div>

          <Divider className="mb-4 mt-3 bg-slate-200" />

          <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:row-span-2 lg:grid-rows-subgrid">
              <label className="space-y-1 text-sm font-medium text-slate-700">ผลการติดตาม<Input disabled value={latestFollowUp?.follow_up_assessment_label || latestFollowUp?.cause_category || "-"} /></label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">คำอธิบายเพิ่มเติม<Textarea className="min-h-28 flex-1 resize-none overflow-y-auto" disabled rows={4} value={latestFollowUp?.cause_detail || ""} /></label>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:row-span-2 lg:grid-rows-subgrid">
              <div className="flex min-w-0 flex-col gap-1 lg:row-span-2">
                <span className="text-sm font-medium text-slate-700">แนบไฟล์</span>
                <div className="min-h-28 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                  <VisitAttachments emptyLabel="ไม่มีไฟล์แนบ" value={latestFollowUp?.photo_paths} />
                </div>
              </div>
            </div>
          </div>
          {reviewReady && !inAssistancePhase ? (
            <ReviewActions actions={reviewActions} can={can} onReview={onReview} />
          ) : null}
        </TrackingStep>
      ) : null}

      {inAssistancePhase ? (
        <TrackingStep
          active={caseRecord.status === "OPEN" || (!hasAssistanceSubmission && !finished)}
          connectNext={hasAssistanceSubmission || reviewReady || finished}
          connectPrev
          number={3}
          title="มอบหมายการช่วยเหลือ"
        >
          {needsReassignment ? (
            <Alert className="mb-4" variant="warning">
              <AlertDescription>ลิงก์เดิมหมดอายุแล้วโดยยังไม่มีการส่งรายงาน กรุณามอบหมายใหม่</AlertDescription>
            </Alert>
          ) : null}
          {showAssignmentForm && canAssign ? (
            <AssignmentForm caseRecord={caseRecord} onAssigned={onAssigned} taskType="ASSIST" />
          ) : showAssignmentForm ? (
            <Alert variant="warning">
              <AlertDescription>บัญชีนี้ไม่มีสิทธิ์มอบหมายการช่วยเหลือ</AlertDescription>
            </Alert>
          ) : (
            <>
              <ReadOnlyAssignment round={latestAssistance} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">มาตรการการช่วยเหลือ<Input disabled value={formatOptionLabels(latestAssistance?.assistance_measures)} /></label>
                <label className="space-y-1 text-sm font-medium text-slate-700">ระบุมาตรการ<Input disabled value={latestAssistance?.assistance_measure_detail || "-"} /></label>
              </div>
            </>
          )}
        </TrackingStep>
      ) : null}

      {inAssistancePhase && (hasAssistanceSubmission || reviewReady || finished) ? (
        <TrackingStep active={reviewReady} connectPrev number={4} title="ให้ความช่วยเหลือ">
          <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:row-span-2 lg:grid-rows-subgrid">
              <label className="space-y-1 text-sm font-medium text-slate-700">วันที่ช่วยเหลือ<Input disabled value={readOnlyDate(latestAssistance?.assisted_at ?? latestAssistance?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">เวลาที่ช่วยเหลือ<Input disabled value={readOnlyTime(latestAssistance?.assisted_at ?? latestAssistance?.submitted_at)} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">มาตรการการช่วยเหลือ<Input disabled value={formatOptionLabels(latestAssistance?.assistance_measures)} /></label>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:row-span-2 lg:grid-rows-subgrid">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">คำอธิบายเพิ่มเติม<Textarea className="min-h-24 flex-1 resize-none overflow-y-auto" disabled rows={3} value={latestAssistance?.assistance_detail || ""} /></label>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">แนบไฟล์</span>
                <div className="min-h-24 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                  <VisitAttachments emptyLabel="ไม่มีไฟล์แนบ" value={latestAssistance?.photo_paths} />
                </div>
              </div>
            </div>
          </div>
          {reviewReady ? <ReviewActions actions={reviewActions} can={can} onReview={onReview} /> : null}
        </TrackingStep>
      ) : null}

      {latestRound?.submitted_at ? <p className="text-xs text-slate-500">อัปเดตล่าสุด {formatThaiDateTime(latestRound.submitted_at)}</p> : null}
    </TrackingStepsCard>
  );
}
