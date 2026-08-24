import type { TaskAccessTask } from "../types/task.types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, LocateFixed, MapPin, PhoneCall, Save } from "lucide-react";
import { z } from "zod";
import {
  Avatar,
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Divider,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  IconButton,
  Input,
  MultiSelect,
  registerField,
  Textarea,
  TimePicker,
} from "../../../components/base";
import { AssignmentSummary } from "../../../components/layout/assignment-summary";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { PAGE_MAX_WIDTH_CLASS } from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import {
  TrackingStep,
  TrackingStepsCard,
} from "../../../components/layout/tracking-step";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { useCaseTrackingOptions } from "../../cases/hooks/useCaseTrackingOptions";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import type { CaseTrackingOptions } from "../../cases/types/cases.types";
import { getGuardianRelationLabel } from "../../students/lib/guardian-relation-presentation";
import { attendanceLookupService } from "../api/attendance-lookup.service";
import { taskService } from "../api/task.service";
import { buildVisitReportFormTitle } from "../lib/task-presentation";
import { VisitMapPreview } from "../components/VisitMapPreview";
import { VisitPhotoUpload } from "../components/VisitPhotoUpload";
import {
  deleteVisitReportDraft,
  loadVisitReportDraft,
  saveVisitReportDraft,
} from "../lib/visit-report-draft";

/**
 * Which follow-up answers demand a free-text description is data, not code: the
 * option rows carry `requiresDetail`, so the schema is built from the loaded
 * catalogue instead of matching option codes by hand.
 */
interface ReportOptionRules {
  guardianTypes: CaseTrackingOptions["guardianTypes"];
  residenceEnvironments: CaseTrackingOptions["residenceEnvironments"];
}

function createReportSchema(rules: ReportOptionRules) {
  return z
    .object({
      visitedDate: z.string().trim().min(1, "กรุณาเลือกวันที่ลงพื้นที่"),
      visitedTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลาที่ลงพื้นที่"),
      disadvantageTypeCodes: z.array(z.string().trim()),
      disabilityTypeCodes: z.array(z.string().trim()),
      problemCategoryCode: z.string().trim(),
      parentalStatusCode: z.string().trim(),
      guardianTypeCode: z.string().trim(),
      guardianTypeDetail: z.string().trim(),
      residenceEnvironmentCodes: z.array(z.string().trim()),
      residenceEnvironmentDetail: z.string().trim(),
      causeDetail: z.string().trim(),
      homeVisitExceptionCode: z.string().trim(),
      updatedAddressLine: z.string().trim(),
      updatedAddressProvince: z.string().trim(),
      updatedAddressDistrict: z.string().trim(),
      updatedAddressSubDistrict: z.string().trim(),
      updatedPostalCode: z.string().trim(),
    })
    .superRefine((values, context) => {
      const guardianType = rules.guardianTypes.find(
        (option) => option.code === values.guardianTypeCode,
      );
      if (guardianType?.requiresDetail && !values.guardianTypeDetail) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุผู้ปกครอง",
          path: ["guardianTypeDetail"],
        });
      }
      const pickedEnvironments = values.residenceEnvironmentCodes ?? [];
      const needsEnvironmentDetail = rules.residenceEnvironments.some(
        (option) =>
          option.requiresDetail && pickedEnvironments.includes(option.code),
      );
      if (needsEnvironmentDetail && !values.residenceEnvironmentDetail) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุรายละเอียดสภาพแวดล้อมรอบที่พัก",
          path: ["residenceEnvironmentDetail"],
        });
      }
      if (values.homeVisitExceptionCode !== "ADDRESS_CHANGED") return;
      const requiredAddressFields: Array<[keyof typeof values, string]> = [
        ["updatedAddressLine", "กรุณากรอกที่อยู่ใหม่"],
        ["updatedAddressProvince", "กรุณากรอกจังหวัด"],
        ["updatedAddressDistrict", "กรุณากรอกอำเภอ/เขต"],
        ["updatedAddressSubDistrict", "กรุณากรอกตำบล/แขวง"],
        ["updatedPostalCode", "กรุณากรอกรหัสไปรษณีย์"],
      ];
      requiredAddressFields.forEach(([field, message]) => {
        if (!values[field])
          context.addIssue({ code: "custom", message, path: [field] });
      });
      if (
        values.updatedPostalCode &&
        !/^\d{5}$/.test(values.updatedPostalCode)
      ) {
        context.addIssue({
          code: "custom",
          message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
          path: ["updatedPostalCode"],
        });
      }
    });
}

type ReportFormValues = z.infer<ReturnType<typeof createReportSchema>>;

function getLocalDateTimeParts(date = new Date()): {
  date: string;
  time: string;
} {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function parseDateTimeParts(value?: string | null): {
  date: string;
  time: string;
} {
  if (!value) return { date: "-", time: "-" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };
  const local = getLocalDateTimeParts(parsed);
  return { date: formatThaiDate(parsed), time: local.time };
}

function getContactRelationLabel(
  contact: NonNullable<ReturnType<typeof getContactChannels>[number]>,
): string {
  if (contact.contact_kind === "STUDENT") return "นักเรียน";
  return getGuardianRelationLabel(contact.relation, contact.relation_note);
}

function getContactChannels(task: {
  contact_channels?: Array<{
    contact_kind: "STUDENT" | "GUARDIAN";
    relation?: string | null;
    relation_note?: string | null;
    full_name?: string | null;
    phone?: string | null;
    is_primary?: boolean;
  }>;
}) {
  return task.contact_channels ?? [];
}

/**
 * Steps 1–2 of a case: the assigned teacher records the home visit.
 *
 * The task is resolved by `ReportPage` and handed in. That split is not
 * cosmetic — while this file was also the dispatcher, every hook here ran for an
 * assistance link too, and the draft autosave below wrote this form's empty
 * values over the assistance draft under the same token.
 */
export function HomeVisitReportPage({
  sessionToken,
  task,
  token,
}: {
  sessionToken: string;
  task: TaskAccessTask;
  token: string;
}) {
  const navigate = useNavigate();
  const initialVisit = useMemo(() => getLocalDateTimeParts(), []);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [photos, setPhotos] = useState<File[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftError, setDraftError] = useState("");

  const trackingOptionsQuery = useCaseTrackingOptions();
  const guardianTypes = useMemo(
    () => trackingOptionsQuery.data?.guardianTypes ?? [],
    [trackingOptionsQuery.data],
  );
  const residenceEnvironments = useMemo(
    () => trackingOptionsQuery.data?.residenceEnvironments ?? [],
    [trackingOptionsQuery.data],
  );
  const resolver = useMemo(
    () =>
      zodResolver(createReportSchema({ guardianTypes, residenceEnvironments })),
    [guardianTypes, residenceEnvironments],
  );

  const defaultValues = useMemo<ReportFormValues>(
    () => ({
      visitedDate: initialVisit.date,
      visitedTime: initialVisit.time,
      disadvantageTypeCodes: [],
      disabilityTypeCodes: [],
      problemCategoryCode: "",
      parentalStatusCode: "",
      guardianTypeCode: "",
      guardianTypeDetail: "",
      residenceEnvironmentCodes: [],
      residenceEnvironmentDetail: "",
      causeDetail: "",
      homeVisitExceptionCode: "",
      updatedAddressLine: "",
      updatedAddressProvince: "",
      updatedAddressDistrict: "",
      updatedAddressSubDistrict: "",
      updatedPostalCode: "",
    }),
    [initialVisit.date, initialVisit.time],
  );

  const form = useForm<ReportFormValues>({ defaultValues, resolver });
  const visitedDate = useWatch({ control: form.control, name: "visitedDate" });
  const visitedTime = useWatch({ control: form.control, name: "visitedTime" });
  const disadvantageTypeCodes =
    useWatch({ control: form.control, name: "disadvantageTypeCodes" }) ?? [];
  const disabilityTypeCodes =
    useWatch({ control: form.control, name: "disabilityTypeCodes" }) ?? [];
  const problemCategoryCode = useWatch({
    control: form.control,
    name: "problemCategoryCode",
  });
  const parentalStatusCode = useWatch({
    control: form.control,
    name: "parentalStatusCode",
  });
  const guardianTypeCode = useWatch({
    control: form.control,
    name: "guardianTypeCode",
  });
  const residenceEnvironmentCodes =
    useWatch({ control: form.control, name: "residenceEnvironmentCodes" }) ??
    [];
  const homeVisitExceptionCode = useWatch({
    control: form.control,
    name: "homeVisitExceptionCode",
  });
  const updatedAddressProvince = useWatch({
    control: form.control,
    name: "updatedAddressProvince",
  });
  const updatedAddressDistrict = useWatch({
    control: form.control,
    name: "updatedAddressDistrict",
  });
  const updatedAddressSubDistrict = useWatch({
    control: form.control,
    name: "updatedAddressSubDistrict",
  });
  const updatedAddressLine = useWatch({
    control: form.control,
    name: "updatedAddressLine",
  });
  const updatedPostalCode = useWatch({
    control: form.control,
    name: "updatedPostalCode",
  });
  const draftFormValues = useWatch({ control: form.control });

  const locationCatalogQuery = useQuery({
    queryKey: ["public-location-catalog"],
    queryFn: attendanceLookupService.getLocations,
    enabled: homeVisitExceptionCode === "ADDRESS_CHANGED",
    staleTime: 30 * 60 * 1000,
  });
  const locationCatalog = locationCatalogQuery.data ?? {
    provinces: [],
    districts: [],
    subDistricts: [],
  };
  const provinceOptions = locationCatalog.provinces.map((province) => ({
    label: province,
    value: province,
  }));
  const districtOptions = Array.from(
    new Set(
      locationCatalog.districts
        .filter((entry) => entry.province === updatedAddressProvince)
        .map((entry) => entry.district),
    ),
  ).map((district) => ({ label: district, value: district }));
  const subDistrictOptions = Array.from(
    new Set(
      locationCatalog.subDistricts
        .filter(
          (entry) =>
            entry.province === updatedAddressProvince &&
            entry.district === updatedAddressDistrict,
        )
        .map((entry) => entry.sub_district),
    ),
  ).map((subDistrict) => ({ label: subDistrict, value: subDistrict }));

  useEffect(() => {
    if (task.status === "COMPLETED" || draftHydrated) return;
    let cancelled = false;
    void loadVisitReportDraft<ReportFormValues>(token)
      .then((draft) => {
        if (cancelled || !draft) return;
        // A draft saved before a field existed has no key for it, so merge over
        // the defaults instead of replacing them — otherwise the restored form
        // holds `undefined` where the UI expects an empty value.
        form.reset({ ...defaultValues, ...draft.formValues });
        setLat(draft.latitude);
        setLng(draft.longitude);
        setPhotos(draft.files);
        setDraftSavedAt(draft.updatedAt);
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
  }, [defaultValues, draftHydrated, form, task, token]);

  useEffect(() => {
    if (!draftHydrated || task.status === "COMPLETED") return;
    const timer = window.setTimeout(() => {
      void saveVisitReportDraft({
        token,
        formValues: form.getValues(),
        latitude: lat,
        longitude: lng,
        files: photos,
      })
        .then((updatedAt) => {
          setDraftSavedAt(updatedAt);
          setDraftError("");
        })
        .catch(() =>
          setDraftError("บันทึกฉบับร่างไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม"),
        );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draftFormValues, draftHydrated, form, lat, lng, photos, task, token]);

  const submitReport = useMutation({
    mutationFn: (values: ReportFormValues) => {
      const visitedAt = new Date(
        `${values.visitedDate}T${values.visitedTime}:00`,
      );
      const formData = new FormData();
      formData.set("visited_at", visitedAt.toISOString());
      formData.set(
        "task_execution_outcome_code",
        values.homeVisitExceptionCode === "STUDENT_NOT_FOUND"
          ? "NOT_SUCCEEDED"
          : "SUCCEEDED",
      );
      values.disadvantageTypeCodes.forEach((code) => {
        formData.append("disadvantage_type_codes", code);
      });
      values.disabilityTypeCodes.forEach((code) => {
        formData.append("disability_type_codes", code);
      });
      // Not finding the student makes every household answer optional rather
      // than forbidden: whatever the visitor did observe is still recorded.
      if (values.problemCategoryCode) {
        formData.set(
          "follow_up_problem_category_code",
          values.problemCategoryCode,
        );
      }
      if (values.parentalStatusCode) {
        formData.set("parental_status_code", values.parentalStatusCode);
      }
      if (values.guardianTypeCode) {
        formData.set("guardian_type_code", values.guardianTypeCode);
        if (values.guardianTypeDetail) {
          formData.set("guardian_type_detail", values.guardianTypeDetail);
        }
      }
      // One field per factor: the backend reads the repeated key as the set of
      // observed environments.
      (values.residenceEnvironmentCodes ?? []).forEach((code) => {
        formData.append("residence_environment_codes", code);
      });
      if (values.residenceEnvironmentDetail) {
        formData.set(
          "residence_environment_detail",
          values.residenceEnvironmentDetail,
        );
      }
      if (values.causeDetail) formData.set("cause_detail", values.causeDetail);
      if (lat) formData.set("visit_lat", lat);
      if (lng) formData.set("visit_lng", lng);
      if (values.homeVisitExceptionCode) {
        formData.set(
          "home_visit_exception_code",
          values.homeVisitExceptionCode,
        );
      }
      if (values.homeVisitExceptionCode === "ADDRESS_CHANGED") {
        formData.set("address_changed", "true");
        formData.set("updated_address_line", values.updatedAddressLine);
        formData.set("updated_address_province", values.updatedAddressProvince);
        formData.set("updated_address_district", values.updatedAddressDistrict);
        formData.set(
          "updated_address_sub_district",
          values.updatedAddressSubDistrict,
        );
        formData.set("updated_postal_code", values.updatedPostalCode);
        formData.set("updated_lat", lat);
        formData.set("updated_lng", lng);
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
      // Carry the heading over: the link is COMPLETED once this returns, so the
      // receipt page can no longer read the student/term context from the task.
      void navigate(`/task/${token}/success?type=visit`, {
        replace: true,
        state: task
          ? {
              formTitle: buildVisitReportFormTitle(task),
              assignedToName: task.assigned_to_name,
            }
          : undefined,
      });
    },
  });

  /**
   * `ปกติ / ไม่มีปัจจัยเสี่ยง` is flagged exclusive in the option catalogue:
   * picking it drops every risk factor, and picking a risk factor drops it.
   */
  function handleResidenceEnvironmentChange(next: string[]): void {
    const exclusiveCodes = new Set(
      residenceEnvironments
        .filter((option) => option.isExclusive)
        .map((option) => option.code),
    );
    const added = next.find(
      (code) => !residenceEnvironmentCodes.includes(code),
    );
    const resolved =
      added && exclusiveCodes.has(added)
        ? [added]
        : next.filter((code) => !exclusiveCodes.has(code));
    form.setValue("residenceEnvironmentCodes", resolved, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }

  function handleUseCurrentLocation(): void {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setLocationStatus("success");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }

  const assignmentStart = parseDateTimeParts(task.opens_at || task.created_at);
  const assignmentEnd = parseDateTimeParts(task.expires_at);
  const formTitle = buildVisitReportFormTitle(task);
  const history = task.follow_up_history ?? [];
  const homeVisitExceptions =
    trackingOptionsQuery.data?.homeVisitExceptions ?? [];
  const guardianRequiresDetail =
    guardianTypes.find((option) => option.code === guardianTypeCode)
      ?.requiresDetail ?? false;
  const contactChannels = getContactChannels(task);
  const trackingStatus = getCaseTrackingStatusPresentation(task.case_status);

  return (
    <GuestPageShell
      contentClassName={cn(PAGE_MAX_WIDTH_CLASS, "space-y-3")}
      profileName={task.assigned_to_name}
    >
      <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">
        {formTitle}
      </h1>

      <StudentTrackingCard
        avatar={
          <Avatar
            className="size-28 shrink-0 text-3xl"
            gradientName={task.student_name || undefined}
          />
        }
        historyItems={history.map((item, index) => ({
          id: `${item.submitted_at ?? index}:${item.assigned_to_name ?? index}`,
          assignee: item.assigned_to_name || "-",
          at: item.visited_at || item.submitted_at,
          reason: task.reason_flagged || "-",
          note: item.cause_detail || "ไม่มีคำอธิบาย",
        }))}
        name={task.student_name || "-"}
        noteLabel="สาเหตุที่ต้องติดตาม"
        noteValue={task.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setMapOpen(true)}
        schoolLine={`${task.student_school || "-"}${
          task.student_grade || task.student_room
            ? ` · ${[task.student_grade, task.student_room ? formatRoomLabel(task.student_room) : null].filter(Boolean).join(" ")}`
            : ""
        }`}
      />

      <Dialog onOpenChange={setMapOpen} open={mapOpen}>
        <DialogContent className="max-w-5xl" onClose={() => setMapOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={MapPin}>พิกัดบ้านนักเรียน</DialogTitle>
          </DialogHeader>
          <VisitMapPreview
            address={task.student_address}
            className="border-0 p-0"
            lat={task.student_lat}
            lng={task.student_lng}
            mapClassName="min-h-[60vh]"
            markerLabel={task.student_name || "บ้านนักเรียน"}
            title={task.student_name || "ข้อมูลพิกัด"}
          />
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setContactsOpen} open={contactsOpen}>
        <DialogContent
          className="max-w-lg"
          onClose={() => setContactsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle icon={PhoneCall}>
              ช่องทางติดต่อนักเรียนและผู้ปกครอง
            </DialogTitle>
          </DialogHeader>
          {contactChannels.length > 0 ? (
            <ul className="space-y-3">
              {contactChannels.map((contact, index) => {
                const phone = contact.phone?.trim() || "";
                const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;
                return (
                  <li
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={`${contact.contact_kind}:${contact.relation ?? ""}:${phone}:${index}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-primary">
                      {(
                        contact.full_name || getContactRelationLabel(contact)
                      ).slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {contact.full_name || "-"}
                        </span>
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-primary">
                          {getContactRelationLabel(contact)}
                          {contact.is_primary &&
                          contact.contact_kind === "GUARDIAN"
                            ? " · ผู้ติดต่อหลัก"
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1 text-sm tabular-nums text-slate-600">
                        {phone}
                      </div>
                    </div>
                    <IconButton
                      aria-label={`โทร ${contact.full_name || getContactRelationLabel(contact)} ${phone}`}
                      icon={PhoneCall}
                      onClick={() => {
                        window.location.href = phoneHref;
                      }}
                      title={`โทร ${phone}`}
                      variant="contact"
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
              <PhoneCall
                className="mb-2 size-8 text-slate-400"
                aria-hidden="true"
              />
              <div className="text-sm font-semibold text-slate-700">
                ยังไม่มีเบอร์ติดต่อ
              </div>
              <p className="mt-1 text-xs text-slate-500">
                ไม่พบเบอร์ของนักเรียนหรือผู้ปกครองในข้อมูลปัจจุบัน
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TrackingStepsCard
        statusClassName={trackingStatus.textClassName}
        statusLabel={task.case_display_status_label || trackingStatus.label}
      >
        <TrackingStep connectNext number={1} title="มอบหมายการติดตาม">
          <AssignmentSummary
            assigneeLabel={task.assigned_to_name || "-"}
            endsAtLabel={assignmentEnd.time}
            endsOnLabel={assignmentEnd.date}
            note={task.assignment_note || ""}
            startsAtLabel={assignmentStart.time}
            startsOnLabel={assignmentStart.date}
          />
        </TrackingStep>

        <TrackingStep active connectPrev number={2} title="ติดตาม">
          <Form form={form} onSubmit={(values) => submitReport.mutate(values)}>
            <div className="space-y-3">
              <FormErrorAlert
                error={trackingOptionsQuery.error ?? submitReport.error}
                fallback="บันทึกผลการติดตามไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
              />

              <section
                aria-labelledby="visit-outcome-title"
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4">
                  <h3
                    className="font-bold text-slate-900"
                    id="visit-outcome-title"
                  >
                    ผลการติดตาม
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    ระบบสรุปว่าติดตามสำเร็จเมื่อเข้าพบนักเรียน
                    และไม่สำเร็จเมื่อเลือกกรณีไม่พบนักเรียน
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <FormItem>
                    <FormLabel>ข้อสังเกตด้านความด้อยโอกาส</FormLabel>
                    <MultiSelect
                      onChange={(value) =>
                        form.setValue("disadvantageTypeCodes", value, {
                          shouldDirty: true,
                        })
                      }
                      options={(
                        trackingOptionsQuery.data?.disadvantageTypes ?? []
                      ).map((option) => ({
                        value: option.code,
                        label: option.label,
                      }))}
                      placeholder="เลือกเฉพาะที่สังเกตพบ"
                      value={disadvantageTypeCodes}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>ข้อสังเกตด้านความพิการ</FormLabel>
                    <MultiSelect
                      onChange={(value) =>
                        form.setValue("disabilityTypeCodes", value, {
                          shouldDirty: true,
                        })
                      }
                      options={(
                        trackingOptionsQuery.data?.disabilityTypes ?? []
                      ).map((option) => ({
                        value: option.code,
                        label: option.label,
                      }))}
                      placeholder="เลือกเฉพาะที่สังเกตพบ"
                      value={disabilityTypeCodes}
                    />
                  </FormItem>
                </div>
              </section>

              {/* Household block: both columns share the same three rows through
                  `grid-rows-subgrid`, so a field that grows moves its whole row
                  on both sides instead of sliding the columns out of step. */}
              <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto]">
                <div
                  className="grid h-full min-w-0 grid-cols-1 gap-x-4 gap-y-3 lg:row-span-3 lg:grid-rows-subgrid"
                  data-visit-report-fields
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel htmlFor="visited-date" required>
                        วันที่ลงพื้นที่
                      </FormLabel>
                      <DatePicker
                        ariaLabel="วันที่ลงพื้นที่"
                        id="visited-date"
                        onChange={(value) =>
                          form.setValue("visitedDate", value, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        value={visitedDate}
                      />
                      <FormMessage<ReportFormValues>
                        className="min-h-0 empty:hidden"
                        name="visitedDate"
                      />
                    </FormItem>
                    <FormItem>
                      <FormLabel htmlFor="visited-time" required>
                        เวลาที่ลงพื้นที่
                      </FormLabel>
                      <TimePicker
                        ariaLabel="เวลาที่ลงพื้นที่"
                        id="visited-time"
                        onChange={(value) =>
                          form.setValue("visitedTime", value, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        value={visitedTime}
                      />
                      <FormMessage<ReportFormValues>
                        className="min-h-0 empty:hidden"
                        name="visitedTime"
                      />
                    </FormItem>
                  </div>

                  <FormItem>
                    <FormLabel htmlFor="parental-status">
                      สถานะของบิดา-มารดา
                    </FormLabel>
                    <Combobox
                      id="parental-status"
                      name="parentalStatusCode"
                      onChange={(value) =>
                        form.setValue("parentalStatusCode", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      options={[
                        // An empty row so a wrong pick can be taken back; the
                        // control has no other way to return to "not answered".
                        { value: "", label: "ไม่ระบุ" },
                        ...(
                          trackingOptionsQuery.data?.parentalStatuses ?? []
                        ).map((option) => ({
                          value: option.code,
                          label: option.label,
                        })),
                      ]}
                      placeholder="เลือกสถานะของบิดา-มารดา"
                      searchable={false}
                      value={parentalStatusCode}
                    />
                    <FormMessage<ReportFormValues>
                      className="min-h-0 empty:hidden"
                      name="parentalStatusCode"
                    />
                  </FormItem>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel htmlFor="guardian-type">ผู้ปกครอง</FormLabel>
                      <Combobox
                        id="guardian-type"
                        name="guardianTypeCode"
                        onChange={(value) => {
                          form.setValue("guardianTypeCode", value, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          });
                          // The note only qualifies an "อื่น ๆ" answer, so it
                          // must not survive a switch to a named relation.
                          const requiresDetail =
                            guardianTypes.find(
                              (option) => option.code === value,
                            )?.requiresDetail ?? false;
                          if (!requiresDetail) {
                            form.setValue("guardianTypeDetail", "", {
                              shouldDirty: true,
                            });
                          }
                        }}
                        options={[
                          { value: "", label: "ไม่ระบุ" },
                          ...guardianTypes.map((option) => ({
                            value: option.code,
                            label: option.label,
                          })),
                        ]}
                        placeholder="เลือกผู้ปกครอง"
                        searchable={false}
                        value={guardianTypeCode}
                      />
                      <FormMessage<ReportFormValues>
                        className="min-h-0 empty:hidden"
                        name="guardianTypeCode"
                      />
                    </FormItem>
                    <FormItem>
                      <FormLabel
                        htmlFor="guardian-type-detail"
                        required={guardianRequiresDetail}
                      >
                        ระบุผู้ปกครอง
                      </FormLabel>
                      <Input
                        className="bg-white"
                        disabled={!guardianRequiresDetail}
                        id="guardian-type-detail"
                        maxLength={200}
                        placeholder={
                          guardianRequiresDetail
                            ? "ระบุผู้ปกครอง"
                            : "เลือกอื่น ๆ เพื่อระบุ"
                        }
                        {...registerField(form, "guardianTypeDetail")}
                      />
                      <FormMessage<ReportFormValues>
                        className="min-h-0 empty:hidden"
                        name="guardianTypeDetail"
                      />
                    </FormItem>
                  </div>
                </div>

                <div
                  className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 lg:row-span-3 lg:grid-rows-subgrid"
                  data-visit-report-context
                >
                  <FormItem>
                    <FormLabel htmlFor="residence-environment">
                      สภาพแวดล้อมรอบที่พัก
                    </FormLabel>
                    <MultiSelect
                      id="residence-environment"
                      onChange={handleResidenceEnvironmentChange}
                      options={residenceEnvironments.map((option) => ({
                        value: option.code,
                        label: option.label,
                      }))}
                      placeholder="เลือกสภาพแวดล้อมรอบที่พัก"
                      singleRow
                      value={residenceEnvironmentCodes}
                    />
                    <FormMessage<ReportFormValues>
                      className="min-h-0 empty:hidden"
                      name="residenceEnvironmentCodes"
                    />
                  </FormItem>

                  {/* Same three-row template as the description field on the
                      left, so the box tops and bottoms land on the same line. */}
                  <FormItem className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-0 space-y-0 lg:row-span-2 lg:pb-2">
                    <FormLabel htmlFor="residence-environment-detail">
                      รายละเอียดสภาพแวดล้อมรอบที่พัก
                    </FormLabel>
                    <Textarea
                      className="h-full min-h-24 resize-none overflow-y-auto bg-white"
                      id="residence-environment-detail"
                      maxLength={2000}
                      placeholder="รายละเอียดสภาพแวดล้อม"
                      {...registerField(form, "residenceEnvironmentDetail")}
                    />
                    <FormMessage<ReportFormValues>
                      className="mt-2 min-h-0 empty:hidden"
                      name="residenceEnvironmentDetail"
                    />
                  </FormItem>
                </div>
              </div>

              {/* Separates what the visit found about the home from what the
                  visitor concluded. Same `slate-200` as the line joining the
                  step numbers, so the panel keeps one rule colour. */}
              <Divider className="my-1 -translate-y-2 bg-slate-200" />

              <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
                <div className="grid h-full min-w-0 grid-cols-1 gap-x-4 gap-y-3 lg:row-span-2 lg:grid-rows-subgrid">
                  <FormItem>
                    <FormLabel htmlFor="follow-up-assessment">
                      หมวดปัญหาที่พบ
                    </FormLabel>
                    <Combobox
                      aria-invalid={
                        form.formState.errors.problemCategoryCode
                          ? true
                          : undefined
                      }
                      id="follow-up-assessment"
                      name="problemCategoryCode"
                      onChange={(value) =>
                        form.setValue("problemCategoryCode", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      options={[
                        { value: "", label: "เลือกผลการติดตาม" },
                        ...(
                          trackingOptionsQuery.data
                            ?.followUpProblemCategories ?? []
                        ).map((option) => ({
                          value: option.code,
                          label: option.guidance
                            ? `${option.label} (${option.guidance})`
                            : option.label,
                        })),
                      ]}
                      searchable={false}
                      value={problemCategoryCode}
                    />
                    <FormMessage<ReportFormValues>
                      className="min-h-0 empty:hidden"
                      name="problemCategoryCode"
                    />
                  </FormItem>

                  <FormItem className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2 space-y-0">
                    <FormLabel htmlFor="cause-detail">
                      คำอธิบายเพิ่มเติม
                    </FormLabel>
                    <Textarea
                      className="h-full min-h-28 resize-none overflow-y-auto bg-white"
                      id="cause-detail"
                      placeholder={
                        homeVisitExceptionCode === "STUDENT_NOT_FOUND"
                          ? "ระบุบริเวณที่ตรวจสอบ บุคคลที่สอบถาม และแนวทางติดตามครั้งถัดไป"
                          : "บันทึกรายละเอียดจากการลงพื้นที่"
                      }
                      {...registerField(form, "causeDetail")}
                    />
                    <FormMessage<ReportFormValues>
                      className="min-h-0 empty:hidden"
                      name="causeDetail"
                    />
                  </FormItem>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 lg:row-span-2 lg:grid-rows-subgrid">
                  <div
                    className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] lg:row-span-2"
                    data-visit-report-upload
                  >
                    <FormLabel className="mb-2">แนบไฟล์</FormLabel>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <VisitPhotoUpload files={photos} onChange={setPhotos} />
                    </div>
                  </div>
                </div>
              </div>

              <Divider className="bg-slate-200" />
              <div>
                <fieldset
                  className="flex flex-wrap items-center gap-x-6 gap-y-2"
                  data-home-visit-exceptions
                >
                  <legend className="sr-only">กรณีพิเศษที่พบ</legend>
                  <span
                    className="mr-1 text-xs font-semibold text-slate-700"
                    aria-hidden="true"
                  >
                    กรณีพิเศษ:
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                    <input
                      checked={!homeVisitExceptionCode}
                      className="size-4 accent-primary"
                      name="home-visit-exception"
                      onChange={() =>
                        form.setValue("homeVisitExceptionCode", "", {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      type="radio"
                    />
                    ไม่มีกรณีพิเศษ
                  </label>
                  {homeVisitExceptions.map((option) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                      key={option.code}
                    >
                      <input
                        checked={homeVisitExceptionCode === option.code}
                        className="size-4 accent-primary"
                        name="home-visit-exception"
                        onChange={() =>
                          form.setValue("homeVisitExceptionCode", option.code, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        type="radio"
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              </div>

              {homeVisitExceptionCode === "ADDRESS_CHANGED" ? (
                <div className="space-y-4">
                  <div className="grid items-stretch gap-x-4 gap-y-3 lg:grid-cols-2">
                    <FormItem className="flex flex-col gap-2 space-y-0">
                      <FormLabel htmlFor="updated-address-line" required>
                        ที่อยู่ใหม่
                      </FormLabel>
                      <Textarea
                        className="min-h-36 flex-1 bg-white"
                        id="updated-address-line"
                        placeholder="บ้านเลขที่ หมู่ ถนน ซอย หรือรายละเอียดจุดสังเกต"
                        {...registerField(form, "updatedAddressLine")}
                      />
                      <FormMessage<ReportFormValues>
                        className="min-h-0 empty:hidden"
                        name="updatedAddressLine"
                      />
                    </FormItem>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormItem>
                        <FormLabel htmlFor="updated-address-province" required>
                          จังหวัด
                        </FormLabel>
                        <Combobox
                          aria-invalid={
                            form.formState.errors.updatedAddressProvince
                              ? true
                              : undefined
                          }
                          disabled={locationCatalogQuery.isLoading}
                          id="updated-address-province"
                          onChange={(value) => {
                            form.setValue("updatedAddressProvince", value, {
                              shouldDirty: true,
                              shouldValidate: form.formState.isSubmitted,
                            });
                            form.setValue("updatedAddressDistrict", "", {
                              shouldDirty: true,
                            });
                            form.setValue("updatedAddressSubDistrict", "", {
                              shouldDirty: true,
                            });
                          }}
                          options={provinceOptions}
                          placeholder="เลือกจังหวัด"
                          value={updatedAddressProvince}
                        />
                        <FormMessage<ReportFormValues>
                          className="min-h-0 empty:hidden"
                          name="updatedAddressProvince"
                        />
                      </FormItem>
                      <FormItem>
                        <FormLabel htmlFor="updated-address-district" required>
                          อำเภอ/เขต
                        </FormLabel>
                        <Combobox
                          aria-invalid={
                            form.formState.errors.updatedAddressDistrict
                              ? true
                              : undefined
                          }
                          disabled={
                            !updatedAddressProvince ||
                            locationCatalogQuery.isLoading
                          }
                          id="updated-address-district"
                          onChange={(value) => {
                            form.setValue("updatedAddressDistrict", value, {
                              shouldDirty: true,
                              shouldValidate: form.formState.isSubmitted,
                            });
                            form.setValue("updatedAddressSubDistrict", "", {
                              shouldDirty: true,
                            });
                          }}
                          options={districtOptions}
                          placeholder="เลือกอำเภอ/เขต"
                          value={updatedAddressDistrict}
                        />
                        <FormMessage<ReportFormValues>
                          className="min-h-0 empty:hidden"
                          name="updatedAddressDistrict"
                        />
                      </FormItem>
                      <FormItem>
                        <FormLabel
                          htmlFor="updated-address-sub-district"
                          required
                        >
                          ตำบล/แขวง
                        </FormLabel>
                        <Combobox
                          aria-invalid={
                            form.formState.errors.updatedAddressSubDistrict
                              ? true
                              : undefined
                          }
                          disabled={
                            !updatedAddressDistrict ||
                            locationCatalogQuery.isLoading
                          }
                          id="updated-address-sub-district"
                          onChange={(value) =>
                            form.setValue("updatedAddressSubDistrict", value, {
                              shouldDirty: true,
                              shouldValidate: form.formState.isSubmitted,
                            })
                          }
                          options={subDistrictOptions}
                          placeholder="เลือกตำบล/แขวง"
                          value={updatedAddressSubDistrict}
                        />
                        <FormMessage<ReportFormValues>
                          className="min-h-0 empty:hidden"
                          name="updatedAddressSubDistrict"
                        />
                      </FormItem>
                      <FormItem>
                        <FormLabel htmlFor="updated-postal-code" required>
                          รหัสไปรษณีย์
                        </FormLabel>
                        <Input
                          className="bg-white"
                          id="updated-postal-code"
                          inputMode="numeric"
                          maxLength={5}
                          {...registerField(form, "updatedPostalCode")}
                        />
                        <FormMessage<ReportFormValues>
                          className="min-h-0 empty:hidden"
                          name="updatedPostalCode"
                        />
                      </FormItem>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {locationStatus === "success" ? (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-success-700">
                        <Check className="size-4" aria-hidden="true" />
                        ระบุพิกัดแล้ว — จะบันทึกพร้อมผลการติดตาม
                      </p>
                    ) : null}
                    {locationStatus === "error" ? (
                      <p
                        className="text-xs font-medium text-danger-700"
                        role="alert"
                      >
                        ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต GPS แล้วลองอีกครั้ง
                      </p>
                    ) : null}
                    <Button
                      icon={LocateFixed}
                      isLoading={locationStatus === "loading"}
                      loadingText="กำลังอ่านตำแหน่ง"
                      onClick={handleUseCurrentLocation}
                      size="sm"
                      type="button"
                      variant="location"
                    >
                      ระบุตำแหน่งที่อยู่ใหม่
                    </Button>
                  </div>
                  <VisitMapPreview
                    address={[
                      updatedAddressLine,
                      updatedAddressSubDistrict,
                      updatedAddressDistrict,
                      updatedAddressProvince,
                      updatedPostalCode,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    className="bg-white p-3"
                    editable
                    emptyDescription="กดบนแผนที่หรือใช้ตำแหน่งปัจจุบันเพื่อวางหมุดที่อยู่ใหม่"
                    emptyTitle="ยังไม่ได้ระบุพิกัดใหม่"
                    lat={lat}
                    lng={lng}
                    mapClassName="min-h-64"
                    markerLabel="ที่อยู่ใหม่"
                    onCoordinateChange={(coordinates) => {
                      setLat(String(coordinates.lat));
                      setLng(String(coordinates.lng));
                      setLocationStatus("success");
                    }}
                    title="พิกัดที่อยู่ใหม่"
                  />
                  {locationCatalogQuery.isError ? (
                    <FormErrorAlert
                      error={locationCatalogQuery.error}
                      fallback="ไม่สามารถโหลดรายการจังหวัดและอำเภอได้ กรุณาลองใหม่"
                    />
                  ) : null}
                </div>
              ) : null}

              <Divider className="bg-slate-200" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <p>
                    ฉบับร่างอยู่เฉพาะ browser/device นี้
                    และยังไม่ถือว่าส่งรายงาน
                  </p>
                  {draftError ? (
                    <p className="mt-1 text-danger-700">{draftError}</p>
                  ) : null}
                  {!draftError && draftSavedAt ? (
                    <p className="mt-1">
                      บันทึกล่าสุด {formatThaiDateTime(draftSavedAt)}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={trackingOptionsQuery.isLoading}
                    icon={Save}
                    isLoading={submitReport.isPending}
                    loadingText="กำลังบันทึก"
                    type="submit"
                  >
                    บันทึกข้อมูล
                  </Button>
                </div>
              </div>
            </div>
          </Form>
        </TrackingStep>
      </TrackingStepsCard>
    </GuestPageShell>
  );
}
