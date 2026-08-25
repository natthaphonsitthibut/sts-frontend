import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import { z } from "zod";
import {
  Avatar,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
  DatePicker,
  TimePicker,
  registerField,
} from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { PAGE_MAX_WIDTH_CLASS } from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { useCaseTrackingOptions } from "../../cases/hooks/useCaseTrackingOptions";
import { taskService } from "../api/task.service";
import { ConversationalReportFlow } from "../components/ConversationalReportFlow";
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
  executionOutcomeCode: z.enum(["SUCCEEDED", "NOT_SUCCEEDED"], {
    message: "กรุณาเลือกผลการช่วยเหลือ",
  }),
  executionOutcomeDetail: z
    .string()
    .trim()
    .max(2000, "เหตุผลต้องไม่เกิน 2,000 ตัวอักษร"),
  assistanceDetail: z
    .string()
    .trim()
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
  const trackingOptionsQuery = useCaseTrackingOptions();
  const [photos, setPhotos] = useState<File[]>([]);
  const defaults = bangkokParts();
  const form = useForm<AssistanceReportValues>({
    resolver: zodResolver(assistanceReportSchema),
    defaultValues: {
      assistedDate: defaults.date,
      assistedTime: defaults.time,
      executionOutcomeCode: "" as "SUCCEEDED",
      executionOutcomeDetail: "",
      assistanceDetail: "",
    },
    mode: "onSubmit",
  });
  const values = useWatch({ control: form.control });
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    if (draftHydrated) return;
    let cancelled = false;
    void loadVisitReportDraft<AssistanceReportValues>(token)
      .then((draft) => {
        if (cancelled || !draft) return;
        form.reset({ ...form.getValues(), ...draft.formValues });
        setPhotos(draft.files);
      })
      .catch(() => {
        if (!cancelled)
          setDraftError("ไม่สามารถกู้คืนฉบับร่างใน browser นี้ได้");
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
        taskExpiresAt: task.expires_at,
        formValues: form.getValues(),
        latitude: "",
        longitude: "",
        files: photos,
      })
        .then(() => setDraftError(""))
        .catch(() =>
          setDraftError("บันทึกฉบับร่างไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม"),
        );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draftHydrated, form, photos, task.expires_at, token, values]);

  const measures = task.assistance_measures ?? [];
  const measureLabel =
    measures.length > 0 ? measures.map((item) => item.label).join(", ") : "-";

  const submitReport = useMutation({
    mutationFn: (report: AssistanceReportValues) => {
      const assistedAt = new Date(
        `${report.assistedDate}T${report.assistedTime}:00`,
      );
      const formData = new FormData();
      formData.set("assisted_at", assistedAt.toISOString());
      formData.set("task_execution_outcome_code", report.executionOutcomeCode);
      if (
        report.executionOutcomeCode === "NOT_SUCCEEDED" &&
        report.executionOutcomeDetail
      ) {
        formData.set("execution_outcome_detail", report.executionOutcomeDetail);
      }
      if (report.assistanceDetail) {
        formData.set("assistance_detail", report.assistanceDetail);
      }
      photos.forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(
        token,
        formData,
        sessionToken || undefined,
      );
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

  const outcomeLabel =
    trackingOptionsQuery.data?.executionOutcomes.find(
      (option) => option.code === values.executionOutcomeCode,
    )?.label ?? "ยังไม่ได้เลือก";

  const steps = [
    {
      id: "assisted-at",
      title: "ให้ความช่วยเหลือเมื่อไร",
      description: "เลือกวันและเวลาที่ดำเนินมาตรการจริง",
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel required>วันที่ให้ความช่วยเหลือ</FormLabel>
            <DatePicker
              ariaLabel="วันที่ให้ความช่วยเหลือ"
              onChange={(value) =>
                form.setValue("assistedDate", value, {
                  shouldDirty: true,
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              value={values.assistedDate ?? ""}
            />
            <FormMessage<AssistanceReportValues> name="assistedDate" />
          </FormItem>
          <FormItem>
            <FormLabel required>เวลาที่ให้ความช่วยเหลือ</FormLabel>
            <TimePicker
              ariaLabel="เวลาที่ให้ความช่วยเหลือ"
              onChange={(value) =>
                form.setValue("assistedTime", value, {
                  shouldDirty: true,
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              value={values.assistedTime ?? ""}
            />
            <FormMessage<AssistanceReportValues> name="assistedTime" />
          </FormItem>
        </div>
      ),
    },
    {
      id: "measures",
      title: "มาตรการที่ได้รับมอบหมาย",
      description: "รายการนี้กำหนดโดยผู้พิจารณาและแก้ไขจากลิงก์รายงานไม่ได้",
      optional: true,
      content: (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{measureLabel}</p>
          {task.assistance_measure_detail ? (
            <p className="text-sm leading-6 text-slate-600">
              {task.assistance_measure_detail}
            </p>
          ) : null}
          {task.assignment_note ? (
            <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
              หมายเหตุมอบหมาย: {task.assignment_note}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "outcome",
      title: "ผลการช่วยเหลือครั้งนี้เป็นอย่างไร",
      description:
        "ผลนี้เป็นหลักฐานของงานรอบนี้ ไม่ได้ปิดเคสหรือส่งต่อโดยอัตโนมัติ",
      content: (
        <FormItem>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">ผลการช่วยเหลือ</legend>
            {(trackingOptionsQuery.data?.executionOutcomes ?? []).map(
              (option) => {
                const selected = values.executionOutcomeCode === option.code;
                return (
                  <label
                    className={cn(
                      "flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-200 motion-reduce:transition-none",
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 bg-white text-slate-800 hover:border-primary/50",
                    )}
                    key={option.code}
                  >
                    <input
                      checked={selected}
                      className="size-5 accent-primary"
                      name="assistance-outcome"
                      onChange={() =>
                        form.setValue("executionOutcomeCode", option.code, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      type="radio"
                      value={option.code}
                    />
                    <span className="text-lg font-bold">{option.label}</span>
                    {selected ? (
                      <Check className="ml-auto size-5" aria-hidden="true" />
                    ) : null}
                  </label>
                );
              },
            )}
          </fieldset>
          <FormMessage<AssistanceReportValues> name="executionOutcomeCode" />
        </FormItem>
      ),
    },
    {
      id: "outcome-detail",
      title: "ถ้ายังไม่สำเร็จ เกิดจากอะไร",
      description:
        values.executionOutcomeCode === "NOT_SUCCEEDED"
          ? "บันทึกเหตุผลสั้น ๆ เพื่อให้ผู้พิจารณาเห็นบริบท"
          : "ผลที่เลือกเป็นสำเร็จ จึงไม่ต้องระบุเหตุผลในข้อนี้",
      optional: true,
      content:
        values.executionOutcomeCode === "NOT_SUCCEEDED" ? (
          <FormItem>
            <FormLabel htmlFor="execution-outcome-detail">
              เหตุผลที่ยังไม่สำเร็จ
            </FormLabel>
            <Textarea
              id="execution-outcome-detail"
              maxLength={2000}
              placeholder="เช่น ผู้ปกครองยังไม่พร้อมเข้าร่วมมาตรการ"
              rows={5}
              {...registerField(form, "executionOutcomeDetail")}
            />
            <FormMessage<AssistanceReportValues> name="executionOutcomeDetail" />
          </FormItem>
        ) : (
          <p className="rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800">
            ไปข้อต่อไปได้เลย
          </p>
        ),
    },
    {
      id: "evidence",
      title: "มีรายละเอียดหรือหลักฐานเพิ่มเติมไหม",
      description: "เพิ่มข้อความหรือไฟล์เท่าที่จำเป็นต่อการพิจารณา",
      optional: true,
      content: (
        <div className="grid gap-4 lg:grid-cols-2">
          <FormItem>
            <FormLabel htmlFor="assistance-detail">
              รายละเอียดการช่วยเหลือ
            </FormLabel>
            <Textarea
              id="assistance-detail"
              maxLength={2000}
              placeholder="อธิบายสิ่งที่ดำเนินการและผลที่สังเกตได้"
              rows={8}
              {...registerField(form, "assistanceDetail")}
            />
            <FormMessage<AssistanceReportValues> name="assistanceDetail" />
          </FormItem>
          <FormItem>
            <FormLabel>แนบไฟล์</FormLabel>
            <VisitPhotoUpload files={photos} onChange={setPhotos} />
          </FormItem>
        </div>
      ),
    },
    {
      id: "review",
      title: "ตรวจทานก่อนส่งให้ผู้พิจารณา",
      description: "ระบบจะส่งข้อมูลเพียงครั้งเดียวเมื่อกดปุ่มด้านล่าง",
      content: (
        <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">วันและเวลา</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {values.assistedDate || "-"} · {values.assistedTime || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">
              ผลการช่วยเหลือ
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {outcomeLabel}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500">มาตรการ</dt>
            <dd className="mt-1 text-slate-800">{measureLabel}</dd>
          </div>
          {values.executionOutcomeDetail ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-slate-500">
                เหตุผลที่ยังไม่สำเร็จ
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-800">
                {values.executionOutcomeDetail}
              </dd>
            </div>
          ) : null}
        </dl>
      ),
    },
  ];

  return (
    <GuestPageShell
      contentClassName={cn(PAGE_MAX_WIDTH_CLASS, "space-y-4")}
      profileName={task.assigned_to_name}
    >
      <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">
        แบบฟอร์มบันทึกการให้ความช่วยเหลือ
      </h1>
      <StudentTrackingCard
        avatar={
          <Avatar
            className="size-28 shrink-0 text-3xl"
            gradientName={task.student_name || undefined}
          />
        }
        historyItems={[]}
        name={task.student_name || "-"}
        noteLabel="สาเหตุที่ต้องติดตาม"
        noteValue={task.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
        onOpenContacts={() => undefined}
        onOpenLocation={() => undefined}
        schoolLine={`${task.student_school || "-"}${
          task.student_grade || task.student_room
            ? ` · ${[
                task.student_grade,
                task.student_room ? formatRoomLabel(task.student_room) : null,
              ]
                .filter(Boolean)
                .join(" ")}`
            : ""
        }`}
      />
      <Form form={form} onSubmit={(report) => submitReport.mutate(report)}>
        <FormErrorAlert
          className="mb-3"
          error={
            trackingOptionsQuery.error ??
            submitReport.error ??
            (draftError ? new Error(draftError) : null)
          }
          fallback="ไม่สามารถบันทึกการให้ความช่วยเหลือได้ กรุณาลองอีกครั้ง"
        />
        <ConversationalReportFlow
          isSubmitting={submitReport.isPending}
          onAdvance={async (stepIndex) => {
            if (stepIndex === 0) {
              return await form.trigger(["assistedDate", "assistedTime"]);
            }
            if (stepIndex === 2) {
              return await form.trigger("executionOutcomeCode");
            }
            if (stepIndex === 3) {
              return await form.trigger("executionOutcomeDetail");
            }
            if (stepIndex === 4) {
              return await form.trigger("assistanceDetail");
            }
            return true;
          }}
          steps={steps}
          submitLabel="ส่งรายงานการช่วยเหลือ"
        />
      </Form>
    </GuestPageShell>
  );
}
