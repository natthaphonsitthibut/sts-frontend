import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";
import { z } from "zod";
import {
  Avatar,
  Button,
  DatePicker,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
  Textarea,
  TimePicker,
} from "../../../components/base";
import { AssignmentSummary } from "../../../components/layout/assignment-summary";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { PAGE_MAX_WIDTH_CLASS } from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import { formatFollowUpProblemCategory } from "../../cases/lib/case-presentation";
import { TrackingStep, TrackingStepsCard } from "../../../components/layout/tracking-step";
import { formatThaiDate } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import { taskService } from "../api/task.service";
import { VisitPhotoUpload } from "../components/VisitPhotoUpload";
import {
  deleteVisitReportDraft,
  loadVisitReportDraft,
  saveVisitReportDraft,
} from "../lib/visit-report-draft";
import type { TaskAccessTask } from "../types/task.types";

const assistanceReportSchema = z.object({
  assistedDate: z.string().min(1, "กรุณาเลือกวันที่ให้ความช่วยเหลือ"),
  assistedTime: z.string().min(1, "กรุณาเลือกเวลาที่ให้ความช่วยเหลือ"),
  assistanceDetail: z
    .string()
    .trim()
    .min(1, "กรุณากรอกคำอธิบายเพิ่มเติม")
    .max(2000, "คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร"),
});

type AssistanceReportValues = z.infer<typeof assistanceReportSchema>;

function bangkokParts(value?: string | null): { date: string; time: string } {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) return { date: "", time: "" };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Bangkok",
      year: "numeric",
    })
      .formatToParts(source)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function readOnlyTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(parsed);
}

function readOnlyDate(value?: string | null): string {
  return value ? formatThaiDate(value) : "-";
}

/**
 * Step 4 of the case: the assigned teacher records what help was delivered.
 * Steps 1–3 render read-only above so the reporter sees what the follow-up
 * round already found, and the numbering matches the case page. The measures
 * are locked — they were committed when the round was assigned.
 */
export function AssistanceReportPage({
  sessionToken,
  task,
  token,
}: {
  sessionToken: string;
  task: TaskAccessTask;
  token: string;
}) {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<File[]>([]);
  const defaults = bangkokParts();
  const form = useForm<AssistanceReportValues>({
    resolver: zodResolver(assistanceReportSchema),
    defaultValues: {
      assistedDate: defaults.date,
      assistedTime: defaults.time,
      assistanceDetail: "",
    },
    mode: "onSubmit",
  });
  const assistedDate = useWatch({ control: form.control, name: "assistedDate" });
  const assistedTime = useWatch({ control: form.control, name: "assistedTime" });
  const assistanceDetail = useWatch({
    control: form.control,
    name: "assistanceDetail",
  });
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftError, setDraftError] = useState("");

  // Same draft store as the home-visit form, keyed by link token: leaving the
  // page and coming back must not lose what was already typed.
  useEffect(() => {
    if (draftHydrated) return;
    let cancelled = false;
    void loadVisitReportDraft<AssistanceReportValues>(token)
      .then((draft) => {
        if (cancelled || !draft) return;
        // Merge over the current values so a draft saved before a field existed
        // does not restore `undefined` into a control the UI expects filled.
        form.reset({ ...form.getValues(), ...draft.formValues });
        setPhotos(draft.files);
      })
      .catch(() => {
        if (!cancelled) setDraftError("ไม่สามารถกู้คืนฉบับร่างใน browser นี้ได้");
      })
      .finally(() => {
        if (!cancelled) setDraftHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftHydrated, form, token]);

  useEffect(() => {
    if (!draftHydrated) return;
    const timer = window.setTimeout(() => {
      void saveVisitReportDraft({
        token,
        formValues: { assistedDate, assistedTime, assistanceDetail },
        latitude: "",
        longitude: "",
        files: photos,
      })
        .then(() => setDraftError(""))
        .catch(() => setDraftError("บันทึกฉบับร่างไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [assistanceDetail, assistedDate, assistedTime, draftHydrated, photos, token]);

  const measures = task.assistance_measures ?? [];
  const measureLabel = measures.length > 0 ? measures.map((item) => item.label).join(", ") : "-";
  // The history is newest-first, so the follow-up round is the one before this.
  const followUp = (task.follow_up_history ?? [])[0];
  const assignmentStart = bangkokParts(task.opens_at ?? task.created_at);
  const assignmentEnd = bangkokParts(task.expires_at);
  const statusPresentation = getCaseTrackingStatusPresentation(task.case_status);

  const submitReport = useMutation({
    mutationFn: (values: AssistanceReportValues) => {
      const assistedAt = new Date(`${values.assistedDate}T${values.assistedTime}:00`);
      const formData = new FormData();
      formData.set("assisted_at", assistedAt.toISOString());
      formData.set("assistance_detail", values.assistanceDetail);
      formData.set("case_follow_up_decision", "REQUEST_REVIEW");
      photos.forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(token, formData, sessionToken || undefined);
    },
    onSuccess: async () => {
      await deleteVisitReportDraft(token).catch(() => undefined);
      void navigate(`/task/${token}/success?type=assist`, {
        replace: true,
        state: {
          formTitle: "แบบฟอร์มบันทึกการให้ความช่วยเหลือ",
          assignedToName: task.assigned_to_name,
        },
      });
    },
  });

  return (
    <GuestPageShell
      contentClassName={cn(PAGE_MAX_WIDTH_CLASS, "space-y-4")}
      profileName={task.assigned_to_name}
    >
      <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">
        แบบฟอร์มบันทึกการให้ความช่วยเหลือ
      </h1>

      <StudentTrackingCard
        avatar={<Avatar className="size-28 shrink-0 text-3xl" gradientName={task.student_name || undefined} />}
        historyItems={[]}
        name={task.student_name || "-"}
        noteLabel="สาเหตุที่ต้องติดตาม"
        noteValue={task.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
        onOpenContacts={() => undefined}
        onOpenLocation={() => undefined}
        schoolLine={`${task.student_school || "-"}${
          task.student_grade || task.student_room
            ? ` · ${[task.student_grade, task.student_room ? formatRoomLabel(task.student_room) : null].filter(Boolean).join(" ")}`
            : ""
        }`}
      />

      <Form form={form} onSubmit={(values) => submitReport.mutate(values)}>
        <TrackingStepsCard
          statusClassName={statusPresentation.textClassName}
          statusLabel={task.case_display_status_label || statusPresentation.label}
        >
          <TrackingStep connectNext number={1} title="มอบหมายการติดตาม">
            <AssignmentSummary
              assigneeLabel={followUp?.assigned_to_name || "-"}
              endsAtLabel={readOnlyTime(followUp?.assignment_ends_at)}
              endsOnLabel={readOnlyDate(followUp?.assignment_ends_at)}
              note={followUp?.assignment_note || ""}
              startsAtLabel={readOnlyTime(followUp?.assignment_starts_at)}
              startsOnLabel={readOnlyDate(followUp?.assignment_starts_at)}
            />
          </TrackingStep>

          <TrackingStep connectNext connectPrev number={2} title="ติดตาม">
            {/* Same rule as step 4: both columns stretch together and the
                description fills what is left, so it ends level with the last
                field on the left instead of overshooting it. */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel>วันที่ลงพื้นที่</FormLabel>
                    <Input
                      disabled
                      value={readOnlyDate(followUp?.visited_at ?? followUp?.submitted_at)}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>เวลาที่ลงพื้นที่</FormLabel>
                    <Input
                      disabled
                      value={readOnlyTime(followUp?.visited_at ?? followUp?.submitted_at)}
                    />
                  </FormItem>
                </div>
                <FormItem>
                  <FormLabel>ผลการติดตาม</FormLabel>
                  <Input
                    disabled
                    value={
                      followUp?.follow_up_problem_category_label
                        ? formatFollowUpProblemCategory({
                            label: followUp.follow_up_problem_category_label,
                            guidance:
                              followUp.follow_up_problem_category_guidance,
                          })
                        : followUp?.exception_label || "-"
                    }
                  />
                </FormItem>
              </div>
              <FormItem className="flex min-h-0 flex-col">
                <FormLabel>คำอธิบายเพิ่มเติม</FormLabel>
                <Textarea
                  className="min-h-24 flex-1 resize-none overflow-y-auto"
                  disabled
                  value={followUp?.cause_detail || ""}
                />
              </FormItem>
            </div>
          </TrackingStep>

          <TrackingStep connectNext connectPrev number={3} title="มอบหมายการช่วยเหลือ">
            <AssignmentSummary
              assigneeLabel={task.assigned_to_name || "-"}
              endsAtLabel={assignmentEnd.time || "-"}
              endsOnLabel={readOnlyDate(task.expires_at)}
              note={task.assignment_note || ""}
              startsAtLabel={assignmentStart.time || "-"}
              startsOnLabel={readOnlyDate(task.opens_at ?? task.created_at)}
            />
          </TrackingStep>

          <TrackingStep active connectPrev number={4} title="ให้ความช่วยเหลือ">
            <FormErrorAlert
              className="mb-4"
              error={submitReport.error ?? (draftError ? new Error(draftError) : null)}
              fallback="ไม่สามารถบันทึกการให้ความช่วยเหลือได้ กรุณาลองอีกครั้ง"
            />
            {/* Both columns stretch to the same height, and the last element in
                each one flexes — so the description ends level with the upload
                box without either being given a hand-tuned height. The textarea
                scrolls rather than growing, so a long report cannot push the
                columns out of step. */}
            {/* The description and the upload card share the last grid row, so
                their bottom edges are the same line by construction rather than
                by matching heights. The description scrolls instead of growing. */}
            <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_minmax(11rem,1fr)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:col-start-1 lg:row-start-1"
                data-assistance-report-fields>
                <FormItem>
                  <FormLabel required>วันที่ให้ความช่วยเหลือ</FormLabel>
                  <DatePicker
                    ariaLabel="วันที่ให้ความช่วยเหลือ"
                    onChange={(value) =>
                      form.setValue("assistedDate", value, { shouldValidate: true })
                    }
                    value={assistedDate}
                  />
                  <FormMessage<AssistanceReportValues>
                    className="min-h-0 empty:hidden"
                    name="assistedDate"
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required>เวลาที่ให้ความช่วยเหลือ</FormLabel>
                  <TimePicker
                    ariaLabel="เวลาที่ให้ความช่วยเหลือ"
                    onChange={(value) =>
                      form.setValue("assistedTime", value, { shouldValidate: true })
                    }
                    value={assistedTime}
                  />
                  <FormMessage<AssistanceReportValues>
                    className="min-h-0 empty:hidden"
                    name="assistedTime"
                  />
                </FormItem>
              </div>

              <FormItem className="lg:col-start-1 lg:row-start-2" data-assistance-report-measures>
                {/* Locked: set when this round was assigned. */}
                <FormLabel>มาตรการการช่วยเหลือ</FormLabel>
                <Input disabled value={measureLabel} />
              </FormItem>

              <FormItem
                className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0 space-y-0 lg:col-start-1 lg:row-start-3"
                data-assistance-report-description
              >
                <FormLabel required>คำอธิบายเพิ่มเติม</FormLabel>
                <Textarea
                  aria-label="คำอธิบายการให้ความช่วยเหลือ"
                  className="h-full min-h-0 resize-none overflow-y-auto"
                  maxLength={2000}
                  placeholder="อธิบายการให้ความช่วยเหลือ"
                  {...registerField(form, "assistanceDetail")}
                />
                <FormMessage<AssistanceReportValues>
                  className="min-h-0 empty:hidden"
                  name="assistanceDetail"
                />
              </FormItem>

              <FormItem
                className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0 space-y-0 lg:col-start-2 lg:row-span-3 lg:row-start-1"
                data-assistance-report-upload
              >
                <FormLabel>แนบไฟล์</FormLabel>
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
                  <VisitPhotoUpload
                    className="min-h-0 flex-1"
                    dropzoneClassName="min-h-0 flex-1"
                    files={photos}
                    onChange={setPhotos}
                  />
                </div>
              </FormItem>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                icon={Save}
                isLoading={submitReport.isPending}
                loadingText="กำลังบันทึก"
                type="submit"
              >
                บันทึกการให้ความช่วยเหลือ
              </Button>
            </div>
          </TrackingStep>
        </TrackingStepsCard>
      </Form>
    </GuestPageShell>
  );
}
