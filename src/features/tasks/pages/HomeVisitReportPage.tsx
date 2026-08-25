import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, LocateFixed, MapPin, PhoneCall } from "lucide-react";
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
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  MultiSelect,
  Select,
  Textarea,
  TimePicker,
  registerField,
} from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { PAGE_MAX_WIDTH_CLASS } from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import { formatThaiDateTime } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { useCaseTrackingOptions } from "../../cases/hooks/useCaseTrackingOptions";
import type { CaseTrackingOptions } from "../../cases/types/cases.types";
import { getGuardianRelationLabel } from "../../students/lib/guardian-relation-presentation";
import { attendanceLookupService } from "../api/attendance-lookup.service";
import { taskService } from "../api/task.service";
import { ConversationalReportFlow } from "../components/ConversationalReportFlow";
import { VisitMapPreview } from "../components/VisitMapPreview";
import { VisitPhotoUpload } from "../components/VisitPhotoUpload";
import {
  deleteVisitReportDraft,
  loadVisitReportDraft,
  saveVisitReportDraft,
} from "../lib/visit-report-draft";
import { buildVisitReportFormTitle } from "../lib/task-presentation";
import type { TaskAccessTask } from "../types/task.types";

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
      contactPersonSelection: z.string().trim(),
      contactPersonName: z.string().trim().max(200, "ชื่อผู้ติดต่อยาวเกินไป"),
      contactChannelCode: z.string().trim(),
      disadvantageTypeCodes: z.array(z.string().trim()),
      disabilityTypeCodes: z.array(z.string().trim()),
      problemCategoryCode: z.string().trim(),
      absenceReasonCategoryCode: z.string().trim(),
      absenceReasonCode: z.string().trim(),
      parentalStatusCode: z.string().trim(),
      guardianTypeCode: z.string().trim(),
      guardianTypeDetail: z.string().trim().max(200),
      residenceEnvironmentCodes: z.array(z.string().trim()),
      residenceEnvironmentDetail: z.string().trim().max(2000),
      causeDetail: z.string().trim().max(2000),
      homeVisitExceptionCode: z.string().trim(),
      updatedAddressLine: z.string().trim(),
      updatedAddressProvince: z.string().trim(),
      updatedAddressDistrict: z.string().trim(),
      updatedAddressSubDistrict: z.string().trim(),
      updatedPostalCode: z.string().trim(),
    })
    .superRefine((values, context) => {
      if (
        values.contactPersonSelection === "OTHER" &&
        !values.contactPersonName
      ) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุผู้ที่พบหรือติดต่อ",
          path: ["contactPersonName"],
        });
      }
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
      const needsEnvironmentDetail = rules.residenceEnvironments.some(
        (option) =>
          option.requiresDetail &&
          values.residenceEnvironmentCodes.includes(option.code),
      );
      if (needsEnvironmentDetail && !values.residenceEnvironmentDetail) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุรายละเอียดสภาพแวดล้อมรอบที่พัก",
          path: ["residenceEnvironmentDetail"],
        });
      }
      if (
        values.homeVisitExceptionCode === "STUDENT_NOT_FOUND" &&
        !values.causeDetail
      ) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุสิ่งที่ตรวจสอบและแนวทางติดตามต่อ",
          path: ["causeDetail"],
        });
      }
      if (values.homeVisitExceptionCode !== "ADDRESS_CHANGED") return;
      const addressFields: Array<[keyof typeof values, string]> = [
        ["updatedAddressLine", "กรุณากรอกที่อยู่ใหม่"],
        ["updatedAddressProvince", "กรุณาเลือกจังหวัด"],
        ["updatedAddressDistrict", "กรุณาเลือกอำเภอ/เขต"],
        ["updatedAddressSubDistrict", "กรุณาเลือกตำบล/แขวง"],
        ["updatedPostalCode", "กรุณากรอกรหัสไปรษณีย์"],
      ];
      addressFields.forEach(([field, message]) => {
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

function localDateTimeParts(date = new Date()): { date: string; time: string } {
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

interface ContactChoice {
  value: string;
  label: string;
  personName: string;
}

function buildContactChoices(task: TaskAccessTask): ContactChoice[] {
  const studentName = task.student_name?.trim() || "นักเรียน";
  const guardianContacts = (task.contact_channels ?? []).filter(
    (contact) => contact.contact_kind === "GUARDIAN",
  );
  const guardianChoices =
    guardianContacts.length > 0
      ? guardianContacts.map((contact, index) => {
          const relationLabel = getGuardianRelationLabel(
            contact.relation,
            contact.relation_note,
          );
          const personName = contact.full_name?.trim() || relationLabel;
          return {
            value: `GUARDIAN_${index}`,
            label: `${relationLabel} · ${personName}`,
            personName,
          };
        })
      : [
          {
            value: "GUARDIAN",
            label: "ผู้ปกครอง/ผู้ดูแล",
            personName: "ผู้ปกครอง/ผู้ดูแล",
          },
        ];

  return [
    {
      value: "STUDENT",
      label: `นักเรียน · ${studentName}`,
      personName: studentName,
    },
    ...guardianChoices,
    {
      value: "STUDENT_AND_GUARDIAN",
      label: "นักเรียนและผู้ปกครอง/ผู้ดูแล",
      personName: `${studentName} และผู้ปกครอง/ผู้ดูแล`,
    },
    { value: "OTHER", label: "บุคคลอื่น", personName: "" },
  ];
}

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
  const initialVisit = useMemo(() => localDateTimeParts(), []);
  const trackingOptionsQuery = useCaseTrackingOptions();
  const guardianTypes = useMemo(
    () => trackingOptionsQuery.data?.guardianTypes ?? [],
    [trackingOptionsQuery.data],
  );
  const residenceEnvironments = useMemo(
    () => trackingOptionsQuery.data?.residenceEnvironments ?? [],
    [trackingOptionsQuery.data],
  );
  const contactChannels = useMemo(
    () => trackingOptionsQuery.data?.contactChannels ?? [],
    [trackingOptionsQuery.data],
  );
  const contactChoices = useMemo(() => buildContactChoices(task), [task]);
  const initialContactSelection = useMemo(() => {
    const prefilledName = task.prefill?.contact_person_name?.trim();
    if (!prefilledName) return "";
    return (
      contactChoices.find((choice) => choice.personName === prefilledName)
        ?.value ?? "OTHER"
    );
  }, [contactChoices, task.prefill?.contact_person_name]);
  const resolver = useMemo(
    () =>
      zodResolver(createReportSchema({ guardianTypes, residenceEnvironments })),
    [guardianTypes, residenceEnvironments],
  );
  const defaultValues = useMemo<ReportFormValues>(
    () => ({
      visitedDate: initialVisit.date,
      visitedTime: initialVisit.time,
      contactPersonSelection: initialContactSelection,
      contactPersonName: task.prefill?.contact_person_name ?? "",
      contactChannelCode: task.prefill?.contact_channel_code ?? "",
      disadvantageTypeCodes: [],
      disabilityTypeCodes: [],
      problemCategoryCode: "",
      absenceReasonCategoryCode: "",
      absenceReasonCode: "",
      parentalStatusCode: task.prefill?.parental_status_code ?? "",
      guardianTypeCode: task.prefill?.guardian_type_code ?? "",
      guardianTypeDetail: task.prefill?.guardian_type_detail ?? "",
      residenceEnvironmentCodes:
        task.prefill?.residence_environment_codes ?? [],
      residenceEnvironmentDetail:
        task.prefill?.residence_environment_detail ?? "",
      causeDetail: "",
      homeVisitExceptionCode: "",
      updatedAddressLine: "",
      updatedAddressProvince: "",
      updatedAddressDistrict: "",
      updatedAddressSubDistrict: "",
      updatedPostalCode: "",
    }),
    [
      initialContactSelection,
      initialVisit.date,
      initialVisit.time,
      task.prefill,
    ],
  );
  const form = useForm<ReportFormValues>({ defaultValues, resolver });
  const values = useWatch({ control: form.control });
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftError, setDraftError] = useState("");
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const addressChanged = values.homeVisitExceptionCode === "ADDRESS_CHANGED";
  const locationCatalogQuery = useQuery({
    queryKey: ["public-location-catalog"],
    queryFn: attendanceLookupService.getLocations,
    enabled: addressChanged,
    staleTime: 30 * 60 * 1000,
  });
  const locationCatalog = locationCatalogQuery.data ?? {
    provinces: [],
    districts: [],
    subDistricts: [],
  };
  const provinceOptions = locationCatalog.provinces.map((value) => ({
    value,
    label: value,
  }));
  const districtOptions = Array.from(
    new Set(
      locationCatalog.districts
        .filter((item) => item.province === values.updatedAddressProvince)
        .map((item) => item.district),
    ),
  ).map((value) => ({ value, label: value }));
  const subDistrictOptions = Array.from(
    new Set(
      locationCatalog.subDistricts
        .filter(
          (item) =>
            item.province === values.updatedAddressProvince &&
            item.district === values.updatedAddressDistrict,
        )
        .map((item) => item.sub_district),
    ),
  ).map((value) => ({ value, label: value }));

  useEffect(() => {
    if (task.status === "COMPLETED" || draftHydrated) return;
    let cancelled = false;
    void loadVisitReportDraft<ReportFormValues>(token)
      .then((draft) => {
        if (cancelled || !draft) return;
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
  }, [defaultValues, draftHydrated, form, task.status, token]);

  useEffect(() => {
    if (!draftHydrated || task.status === "COMPLETED") return;
    const timer = window.setTimeout(() => {
      void saveVisitReportDraft({
        token,
        taskExpiresAt: task.expires_at,
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
  }, [
    draftHydrated,
    form,
    lat,
    lng,
    photos,
    task.expires_at,
    task.status,
    token,
    values,
  ]);

  const submitReport = useMutation({
    mutationFn: (report: ReportFormValues) => {
      const formData = new FormData();
      const visitedAt = new Date(
        `${report.visitedDate}T${report.visitedTime}:00`,
      );
      formData.set("visited_at", visitedAt.toISOString());
      formData.set(
        "task_execution_outcome_code",
        report.homeVisitExceptionCode === "STUDENT_NOT_FOUND"
          ? "NOT_SUCCEEDED"
          : "SUCCEEDED",
      );
      if (report.contactPersonName)
        formData.set("contact_person_name", report.contactPersonName);
      if (report.contactChannelCode)
        formData.set("contact_channel_code", report.contactChannelCode);
      report.disadvantageTypeCodes.forEach((code) =>
        formData.append("disadvantage_type_codes", code),
      );
      report.disabilityTypeCodes.forEach((code) =>
        formData.append("disability_type_codes", code),
      );
      if (report.problemCategoryCode) {
        formData.set(
          "follow_up_problem_category_code",
          report.problemCategoryCode,
        );
      }
      if (report.absenceReasonCategoryCode) {
        formData.set(
          "absence_reason_category_code",
          report.absenceReasonCategoryCode,
        );
      }
      if (report.absenceReasonCode) {
        formData.set("absence_reason_code", report.absenceReasonCode);
      }
      if (report.parentalStatusCode)
        formData.set("parental_status_code", report.parentalStatusCode);
      if (report.guardianTypeCode)
        formData.set("guardian_type_code", report.guardianTypeCode);
      if (report.guardianTypeDetail)
        formData.set("guardian_type_detail", report.guardianTypeDetail);
      report.residenceEnvironmentCodes.forEach((code) =>
        formData.append("residence_environment_codes", code),
      );
      if (report.residenceEnvironmentDetail) {
        formData.set(
          "residence_environment_detail",
          report.residenceEnvironmentDetail,
        );
      }
      if (report.causeDetail) formData.set("cause_detail", report.causeDetail);
      if (report.homeVisitExceptionCode) {
        formData.set(
          "home_visit_exception_code",
          report.homeVisitExceptionCode,
        );
      }
      if (lat) formData.set("visit_lat", lat);
      if (lng) formData.set("visit_lng", lng);
      if (addressChanged) {
        formData.set("address_changed", "true");
        formData.set("updated_address_line", report.updatedAddressLine);
        formData.set("updated_address_province", report.updatedAddressProvince);
        formData.set("updated_address_district", report.updatedAddressDistrict);
        formData.set(
          "updated_address_sub_district",
          report.updatedAddressSubDistrict,
        );
        formData.set("updated_postal_code", report.updatedPostalCode);
        if (lat) formData.set("updated_lat", lat);
        if (lng) formData.set("updated_lng", lng);
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
      void navigate(`/task/${token}/success?type=visit`, {
        replace: true,
        state: {
          formTitle: buildVisitReportFormTitle(task),
          assignedToName: task.assigned_to_name,
        },
      });
    },
  });

  function handleResidenceEnvironmentChange(next: string[]): void {
    const exclusiveCodes = new Set(
      residenceEnvironments
        .filter((option) => option.isExclusive)
        .map((option) => option.code),
    );
    const added = next.find(
      (code) => !values.residenceEnvironmentCodes?.includes(code),
    );
    const resolved =
      added && exclusiveCodes.has(added)
        ? [added]
        : next.filter((code) => !exclusiveCodes.has(code));
    form.setValue("residenceEnvironmentCodes", resolved, { shouldDirty: true });
  }

  function handleVisitOutcomeChange(code: "" | "STUDENT_NOT_FOUND"): void {
    form.setValue("homeVisitExceptionCode", code, { shouldDirty: true });
    if (code !== "STUDENT_NOT_FOUND") return;
    form.setValue("contactPersonSelection", "", { shouldDirty: true });
    form.setValue("contactPersonName", "", { shouldDirty: true });
    form.setValue("contactChannelCode", "", { shouldDirty: true });
    form.setValue("problemCategoryCode", "", { shouldDirty: true });
    form.setValue("absenceReasonCategoryCode", "", { shouldDirty: true });
    form.setValue("absenceReasonCode", "", { shouldDirty: true });
    form.setValue("parentalStatusCode", "", { shouldDirty: true });
    form.setValue("guardianTypeCode", "", { shouldDirty: true });
    form.setValue("guardianTypeDetail", "", { shouldDirty: true });
    form.setValue("residenceEnvironmentCodes", [], { shouldDirty: true });
    form.setValue("residenceEnvironmentDetail", "", { shouldDirty: true });
    form.setValue("disadvantageTypeCodes", [], { shouldDirty: true });
    form.setValue("disabilityTypeCodes", [], { shouldDirty: true });
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

  const guardianRequiresDetail =
    guardianTypes.find((option) => option.code === values.guardianTypeCode)
      ?.requiresDetail ?? false;
  const contacts = task.contact_channels ?? [];
  const studentNotFound = values.homeVisitExceptionCode === "STUDENT_NOT_FOUND";
  // The two answers below are the follow-up outcome, so both the choice and the
  // review read the catalog's follow-up wording instead of a second vocabulary.
  const visitOutcomeLabel = (code: "SUCCEEDED" | "NOT_SUCCEEDED"): string =>
    trackingOptionsQuery.data?.executionOutcomes.find(
      (option) => option.code === code,
    )?.visitLabel ?? "";
  const outcomeLabel = visitOutcomeLabel(
    studentNotFound ? "NOT_SUCCEEDED" : "SUCCEEDED",
  );
  const categoryLabel =
    trackingOptionsQuery.data?.followUpProblemCategories.find(
      (option) => option.code === values.problemCategoryCode,
    )?.label ?? "ไม่ระบุ";
  const absenceReasonLabel =
    trackingOptionsQuery.data?.absenceReasons.find(
      (option) => option.code === values.absenceReasonCode,
    )?.label ?? "ไม่ระบุ";
  const absenceReasonCategories = Array.from(
    new Map(
      (trackingOptionsQuery.data?.absenceReasons ?? [])
        .filter((option) => option.categoryCode && option.categoryLabel)
        .map((option) => [
          option.categoryCode as string,
          {
            code: option.categoryCode as string,
            label: option.categoryLabel as string,
          },
        ]),
    ).values(),
  );
  const absenceReasonCategoryLabel =
    absenceReasonCategories.find(
      (option) => option.code === values.absenceReasonCategoryCode,
    )?.label ?? "ไม่ระบุ";
  const filteredAbsenceReasons = (
    trackingOptionsQuery.data?.absenceReasons ?? []
  ).filter(
    (option) =>
      option.code === "UNKNOWN" ||
      (Boolean(values.absenceReasonCategoryCode) &&
        option.categoryCode === values.absenceReasonCategoryCode),
  );

  const allSteps = [
    {
      id: "visited-at",
      title: "ไปเยี่ยมหรือติดตามเมื่อไร",
      description: "ระบบใส่เวลาปัจจุบันไว้ให้และสามารถแก้ไขได้",
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel required>วันที่ลงพื้นที่</FormLabel>
            <DatePicker
              ariaLabel="วันที่ลงพื้นที่"
              onChange={(value) =>
                form.setValue("visitedDate", value, { shouldDirty: true })
              }
              value={values.visitedDate ?? ""}
            />
            <FormMessage<ReportFormValues> name="visitedDate" />
          </FormItem>
          <FormItem>
            <FormLabel required>เวลาที่ลงพื้นที่</FormLabel>
            <TimePicker
              ariaLabel="เวลาที่ลงพื้นที่"
              onChange={(value) =>
                form.setValue("visitedTime", value, { shouldDirty: true })
              }
              value={values.visitedTime ?? ""}
            />
            <FormMessage<ReportFormValues> name="visitedTime" />
          </FormItem>
        </div>
      ),
    },
    {
      id: "visit-outcome",
      title: "ครั้งนี้พบหรือติดต่อนักเรียนได้ไหม",
      description: "คำตอบนี้เป็นตัวกำหนดผลการติดตามของรอบนี้",
      content: (
        <FormItem>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">ผลการติดตาม</legend>
            {[
              { code: "", label: visitOutcomeLabel("SUCCEEDED") },
              {
                code: "STUDENT_NOT_FOUND",
                label: visitOutcomeLabel("NOT_SUCCEEDED"),
              },
            ].map((option) => {
              const selected = values.homeVisitExceptionCode === option.code;
              return (
                <label
                  className={cn(
                    "flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-200 motion-reduce:transition-none",
                    selected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 hover:border-primary/50",
                  )}
                  key={option.code || "FOUND"}
                >
                  <input
                    checked={selected}
                    className="size-5 accent-primary"
                    name="visit-outcome"
                    onChange={() =>
                      handleVisitOutcomeChange(
                        option.code as "" | "STUDENT_NOT_FOUND",
                      )
                    }
                    type="radio"
                    value={option.code || "FOUND"}
                  />
                  <span className="text-lg font-bold">{option.label}</span>
                  {selected ? (
                    <Check className="ml-auto size-5" aria-hidden="true" />
                  ) : null}
                </label>
              );
            })}
          </fieldset>
        </FormItem>
      ),
    },
    {
      id: "contact",
      title: "ครั้งนี้พบหรือติดต่อใคร",
      optional: true,
      content: (
        <div className="space-y-4">
          <FormItem>
            <FormLabel>ผู้ที่พบ/ติดต่อ</FormLabel>
            <Combobox
              id="contact-person-selection"
              onChange={(value) => {
                form.setValue("contactPersonSelection", value, {
                  shouldDirty: true,
                });
                const selected = contactChoices.find(
                  (choice) => choice.value === value,
                );
                form.setValue("contactPersonName", selected?.personName ?? "", {
                  shouldDirty: true,
                });
              }}
              options={[
                { value: "", label: "ไม่ระบุ" },
                ...contactChoices.map((choice) => ({
                  value: choice.value,
                  label: choice.label,
                })),
              ]}
              placeholder="เลือกผู้ที่พบหรือติดต่อ"
              searchable={false}
              value={values.contactPersonSelection ?? ""}
            />
          </FormItem>
          {values.contactPersonSelection === "OTHER" ? (
            <FormItem>
              <FormLabel htmlFor="contact-person-name">
                ระบุผู้ที่พบ/ติดต่อ
              </FormLabel>
              <Input
                id="contact-person-name"
                maxLength={200}
                placeholder="เช่น เพื่อนบ้าน ผู้นำชุมชน"
                {...registerField(form, "contactPersonName")}
              />
              <FormMessage<ReportFormValues> name="contactPersonName" />
            </FormItem>
          ) : null}
          <FormItem>
            <FormLabel htmlFor="contact-channel">ช่องทางติดต่อ</FormLabel>
            <Select
              id="contact-channel"
              onChange={(event) =>
                form.setValue("contactChannelCode", event.target.value, {
                  shouldDirty: true,
                })
              }
              value={values.contactChannelCode ?? ""}
            >
              <option value="">ไม่ระบุ</option>
              {contactChannels.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormItem>
        </div>
      ),
    },
    {
      id: "guardian",
      title: "ข้อมูลผู้ปกครองและครอบครัวเป็นอย่างไร",
      description:
        "แก้ไขข้อมูลจากครั้งก่อนได้ ระบบจะบันทึกเป็นข้อมูลของการติดตามครั้งนี้",
      optional: true,
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel>สถานะของบิดา-มารดา</FormLabel>
            <Combobox
              onChange={(value) =>
                form.setValue("parentalStatusCode", value, {
                  shouldDirty: true,
                })
              }
              options={[
                { value: "", label: "ไม่ระบุ" },
                ...(trackingOptionsQuery.data?.parentalStatuses ?? []).map(
                  (option) => ({ value: option.code, label: option.label }),
                ),
              ]}
              placeholder="เลือกสถานะ"
              searchable={false}
              value={values.parentalStatusCode ?? ""}
            />
          </FormItem>
          <FormItem>
            <FormLabel>ผู้ปกครอง/ผู้ดูแล</FormLabel>
            <Combobox
              onChange={(value) => {
                form.setValue("guardianTypeCode", value, { shouldDirty: true });
                if (
                  !guardianTypes.find((option) => option.code === value)
                    ?.requiresDetail
                ) {
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
              value={values.guardianTypeCode ?? ""}
            />
          </FormItem>
          {guardianRequiresDetail ? (
            <FormItem className="sm:col-span-2">
              <FormLabel required>ระบุผู้ปกครอง/ผู้ดูแล</FormLabel>
              <Input
                maxLength={200}
                {...registerField(form, "guardianTypeDetail")}
              />
              <FormMessage<ReportFormValues> name="guardianTypeDetail" />
            </FormItem>
          ) : null}
        </div>
      ),
    },
    {
      id: "absence-reason",
      title: "นักเรียนขาดเรียนด้วยสาเหตุอะไร",
      description: "เลือกประเภทก่อน แล้วรายการสาเหตุจะเหลือเฉพาะของประเภทนั้น",
      optional: true,
      content: (
        <div className="space-y-4">
          <FormItem>
            <FormLabel>ประเภทการขาด</FormLabel>
            <Combobox
              id="absence-reason-category"
              onChange={(value) => {
                form.setValue("absenceReasonCategoryCode", value, {
                  shouldDirty: true,
                });
                form.setValue("absenceReasonCode", "", { shouldDirty: true });
              }}
              options={[
                { value: "", label: "ไม่ระบุ" },
                ...absenceReasonCategories.map((option) => ({
                  value: option.code,
                  label: option.label,
                })),
              ]}
              placeholder="เลือกประเภทการขาด"
              searchable={false}
              value={values.absenceReasonCategoryCode ?? ""}
            />
          </FormItem>
          <FormItem>
            <FormLabel>สาเหตุการขาด</FormLabel>
            <Combobox
              emptyText="ไม่พบสาเหตุการขาด"
              id="absence-reason"
              onChange={(value) => {
                const selected = trackingOptionsQuery.data?.absenceReasons.find(
                  (option) => option.code === value,
                );
                form.setValue("absenceReasonCode", value, {
                  shouldDirty: true,
                });
                if (selected?.categoryCode) {
                  form.setValue(
                    "absenceReasonCategoryCode",
                    selected.categoryCode,
                    {
                      shouldDirty: true,
                    },
                  );
                } else if (value === "UNKNOWN") {
                  form.setValue("absenceReasonCategoryCode", "", {
                    shouldDirty: true,
                  });
                }
              }}
              options={[
                { value: "", label: "ไม่ระบุ" },
                ...filteredAbsenceReasons.map((option) => ({
                  value: option.code,
                  label: option.label,
                })),
              ]}
              placeholder={
                values.absenceReasonCategoryCode
                  ? "เลือกสาเหตุการขาด"
                  : "เลือกประเภทก่อน หรือเลือกยังไม่ทราบสาเหตุ"
              }
              searchable={filteredAbsenceReasons.length > 8}
              value={values.absenceReasonCode ?? ""}
            />
          </FormItem>
        </div>
      ),
    },
    {
      id: "context",
      title: studentNotFound
        ? "ได้ตรวจสอบอะไรแล้ว และจะติดตามต่ออย่างไร"
        : "พบปัญหาด้านไหน",
      description: studentNotFound
        ? "ระบุบริเวณที่ตรวจสอบ บุคคลที่สอบถาม และแนวทางติดตามครั้งถัดไป"
        : undefined,
      optional: !studentNotFound,
      content: (
        <div className="space-y-4">
          {!studentNotFound ? (
            <FormItem>
              <FormLabel>ประเภทปัญหาที่พบ</FormLabel>
              <Combobox
                onChange={(value) =>
                  form.setValue("problemCategoryCode", value, {
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: "", label: "ไม่ระบุ" },
                  ...(
                    trackingOptionsQuery.data?.followUpProblemCategories ?? []
                  ).map((option) => ({
                    value: option.code,
                    label: option.guidance
                      ? `${option.label} (${option.guidance})`
                      : option.label,
                  })),
                ]}
                placeholder="เลือกประเภทปัญหา"
                searchable={false}
                value={values.problemCategoryCode ?? ""}
              />
            </FormItem>
          ) : null}
          <FormItem>
            <FormLabel required={studentNotFound}>
              {studentNotFound ? "รายละเอียดการตรวจสอบ" : "คำอธิบายเพิ่มเติม"}
            </FormLabel>
            <Textarea
              maxLength={2000}
              placeholder={
                values.homeVisitExceptionCode === "STUDENT_NOT_FOUND"
                  ? "ระบุบริเวณที่ตรวจสอบ บุคคลที่สอบถาม และแนวทางติดตามครั้งถัดไป"
                  : "บันทึกรายละเอียดจากการลงพื้นที่"
              }
              rows={6}
              {...registerField(form, "causeDetail")}
            />
            <FormMessage<ReportFormValues> name="causeDetail" />
          </FormItem>
        </div>
      ),
    },
    {
      id: "residence",
      title: "สภาพครัวเรือนและที่พักเป็นอย่างไร",
      optional: true,
      content: (
        <div className="space-y-4">
          <FormItem>
            <FormLabel>สภาพแวดล้อมรอบที่พัก</FormLabel>
            <MultiSelect
              onChange={handleResidenceEnvironmentChange}
              options={residenceEnvironments.map((option) => ({
                value: option.code,
                label: option.label,
              }))}
              placeholder="ไม่ระบุ"
              value={values.residenceEnvironmentCodes ?? []}
            />
          </FormItem>
          <FormItem>
            <FormLabel>รายละเอียดสภาพแวดล้อม</FormLabel>
            <Textarea
              maxLength={2000}
              rows={6}
              {...registerField(form, "residenceEnvironmentDetail")}
            />
            <FormMessage<ReportFormValues> name="residenceEnvironmentDetail" />
          </FormItem>
        </div>
      ),
    },
    {
      id: "care",
      title: "มีข้อมูลที่ควรคำนึงในการดูแลไหม",
      description:
        "ข้อมูลที่เลือกจะบันทึกพร้อมรอบการติดตามนี้และแสดงแหล่งที่มาในประวัตินักเรียน",
      optional: true,
      content: (
        <div className="space-y-4">
          <FormItem>
            <FormLabel>ข้อสังเกตด้านความด้อยโอกาส</FormLabel>
            <MultiSelect
              id="observed-disadvantage-types"
              onChange={(value) =>
                form.setValue("disadvantageTypeCodes", value, {
                  shouldDirty: true,
                })
              }
              options={(trackingOptionsQuery.data?.disadvantageTypes ?? []).map(
                (option) => ({ value: option.code, label: option.label }),
              )}
              placeholder="ไม่ระบุ"
              value={values.disadvantageTypeCodes ?? []}
            />
          </FormItem>
          <FormItem>
            <FormLabel>ข้อสังเกตด้านความพิการ</FormLabel>
            <MultiSelect
              id="observed-disability-types"
              onChange={(value) =>
                form.setValue("disabilityTypeCodes", value, {
                  shouldDirty: true,
                })
              }
              options={(trackingOptionsQuery.data?.disabilityTypes ?? []).map(
                (option) => ({ value: option.code, label: option.label }),
              )}
              placeholder="ไม่ระบุ"
              value={values.disabilityTypeCodes ?? []}
            />
          </FormItem>
        </div>
      ),
    },
    {
      id: "evidence",
      title: studentNotFound
        ? "มีรูปหรือพิกัดประกอบไหม"
        : "มีรูป พิกัด หรือที่อยู่เปลี่ยนไหม",
      optional: true,
      content: (
        <div className="space-y-5">
          {values.homeVisitExceptionCode !== "STUDENT_NOT_FOUND" ? (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800">
              <input
                checked={addressChanged}
                className="size-5 accent-primary"
                onChange={(event) =>
                  form.setValue(
                    "homeVisitExceptionCode",
                    event.target.checked ? "ADDRESS_CHANGED" : "",
                    { shouldDirty: true },
                  )
                }
                type="checkbox"
              />
              ที่อยู่ปัจจุบันเปลี่ยนจากข้อมูลในระบบ
            </label>
          ) : null}
          {addressChanged ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormItem className="sm:col-span-2">
                <FormLabel required>ที่อยู่ใหม่</FormLabel>
                <Textarea
                  rows={3}
                  {...registerField(form, "updatedAddressLine")}
                />
                <FormMessage<ReportFormValues> name="updatedAddressLine" />
              </FormItem>
              <FormItem>
                <FormLabel required>จังหวัด</FormLabel>
                <Combobox
                  disabled={locationCatalogQuery.isLoading}
                  onChange={(value) => {
                    form.setValue("updatedAddressProvince", value, {
                      shouldDirty: true,
                    });
                    form.setValue("updatedAddressDistrict", "");
                    form.setValue("updatedAddressSubDistrict", "");
                  }}
                  options={provinceOptions}
                  placeholder="เลือกจังหวัด"
                  value={values.updatedAddressProvince ?? ""}
                />
                <FormMessage<ReportFormValues> name="updatedAddressProvince" />
              </FormItem>
              <FormItem>
                <FormLabel required>อำเภอ/เขต</FormLabel>
                <Combobox
                  disabled={
                    !values.updatedAddressProvince ||
                    locationCatalogQuery.isLoading
                  }
                  onChange={(value) => {
                    form.setValue("updatedAddressDistrict", value, {
                      shouldDirty: true,
                    });
                    form.setValue("updatedAddressSubDistrict", "");
                  }}
                  options={districtOptions}
                  placeholder="เลือกอำเภอ/เขต"
                  value={values.updatedAddressDistrict ?? ""}
                />
                <FormMessage<ReportFormValues> name="updatedAddressDistrict" />
              </FormItem>
              <FormItem>
                <FormLabel required>ตำบล/แขวง</FormLabel>
                <Combobox
                  disabled={
                    !values.updatedAddressDistrict ||
                    locationCatalogQuery.isLoading
                  }
                  onChange={(value) =>
                    form.setValue("updatedAddressSubDistrict", value, {
                      shouldDirty: true,
                    })
                  }
                  options={subDistrictOptions}
                  placeholder="เลือกตำบล/แขวง"
                  value={values.updatedAddressSubDistrict ?? ""}
                />
                <FormMessage<ReportFormValues> name="updatedAddressSubDistrict" />
              </FormItem>
              <FormItem>
                <FormLabel required>รหัสไปรษณีย์</FormLabel>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  {...registerField(form, "updatedPostalCode")}
                />
                <FormMessage<ReportFormValues> name="updatedPostalCode" />
              </FormItem>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon={LocateFixed}
              isLoading={locationStatus === "loading"}
              loadingText="กำลังอ่านตำแหน่ง"
              onClick={handleUseCurrentLocation}
              type="button"
              variant="location"
            >
              ใช้ตำแหน่งปัจจุบัน
            </Button>
            {locationStatus === "success" ? (
              <span className="text-sm font-semibold text-success-700">
                ระบุพิกัดแล้ว
              </span>
            ) : null}
            {locationStatus === "error" ? (
              <span
                className="text-sm font-semibold text-danger-700"
                role="alert"
              >
                อ่านตำแหน่งไม่ได้ แต่ยังส่งรายงานได้
              </span>
            ) : null}
          </div>
          {addressChanged ? (
            <VisitMapPreview
              address={[
                values.updatedAddressLine,
                values.updatedAddressSubDistrict,
                values.updatedAddressDistrict,
                values.updatedAddressProvince,
                values.updatedPostalCode,
              ]
                .filter(Boolean)
                .join(" ")}
              editable
              lat={lat}
              lng={lng}
              markerLabel="ที่อยู่ใหม่"
              onCoordinateChange={(coordinates) => {
                setLat(String(coordinates.lat));
                setLng(String(coordinates.lng));
                setLocationStatus("success");
              }}
              title="พิกัดที่อยู่ใหม่"
            />
          ) : null}
          <FormItem>
            <FormLabel>แนบรูปหรือไฟล์</FormLabel>
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
            <dd className="mt-1 font-semibold">
              {values.visitedDate || "-"} · {values.visitedTime || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">
              ผลการติดตาม
            </dt>
            <dd className="mt-1 font-semibold">{outcomeLabel}</dd>
          </div>
          {studentNotFound ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-slate-500">
                สิ่งที่ตรวจสอบและแนวทางติดตามต่อ
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {values.causeDetail || "-"}
              </dd>
            </div>
          ) : (
            <>
              <div>
                <dt className="text-xs font-semibold text-slate-500">
                  ผู้ที่พบ/ติดต่อ
                </dt>
                <dd className="mt-1">
                  {values.contactPersonName || "ไม่ระบุ"}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500">
                  ปัญหาที่พบ
                </dt>
                <dd className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <span>
                    <span className="text-slate-500">ประเภทปัญหา:</span>{" "}
                    {categoryLabel}
                  </span>
                  <span className="whitespace-pre-wrap">
                    <span className="text-slate-500">คำอธิบายเพิ่มเติม:</span>{" "}
                    {values.causeDetail || "ไม่ระบุ"}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500">
                  สาเหตุการขาด
                </dt>
                <dd className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <span>
                    <span className="text-slate-500">ประเภทการขาด:</span>{" "}
                    {absenceReasonCategoryLabel}
                  </span>
                  <span>
                    <span className="text-slate-500">สาเหตุ:</span>{" "}
                    {absenceReasonLabel}
                  </span>
                </dd>
              </div>
            </>
          )}
          {!studentNotFound ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-slate-500">
                ที่อยู่ปัจจุบัน
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {addressChanged
                  ? [
                      values.updatedAddressLine,
                      values.updatedAddressSubDistrict,
                      values.updatedAddressDistrict,
                      values.updatedAddressProvince,
                      values.updatedPostalCode,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "ไม่เปลี่ยนจากข้อมูลในระบบ"}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500">หลักฐาน</dt>
            <dd className="mt-1">
              {photos.length} ไฟล์ {lat && lng ? "· มีพิกัด" : "· ไม่มีพิกัด"}
            </dd>
          </div>
        </dl>
      ),
    },
  ];
  const steps = studentNotFound
    ? allSteps.filter((step) =>
        [
          "visited-at",
          "visit-outcome",
          "context",
          "evidence",
          "review",
        ].includes(step.id),
      )
    : allSteps;

  return (
    <GuestPageShell
      contentClassName={cn(PAGE_MAX_WIDTH_CLASS, "space-y-4")}
      profileName={task.assigned_to_name}
    >
      <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">
        {buildVisitReportFormTitle(task)}
      </h1>
      <StudentTrackingCard
        avatar={
          <Avatar
            className="size-28 shrink-0 text-3xl"
            gradientName={task.student_name || undefined}
          />
        }
        historyItems={(task.follow_up_history ?? [])
          .map((item, index) => ({
            id: `${item.submitted_at ?? index}`,
            assignee: item.assigned_to_name || "-",
            note: item.cause_detail || item.exception_label || "-",
            at: item.submitted_at || item.visited_at || "",
            reason: task.reason_flagged || "-",
          }))
          .filter((item) => item.at)}
        name={task.student_name || "-"}
        noteLabel="สาเหตุที่ต้องติดตาม"
        noteValue={task.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setMapOpen(true)}
        schoolLine={`${task.student_school || "-"}${task.student_grade || task.student_room ? ` · ${[task.student_grade, task.student_room ? formatRoomLabel(task.student_room) : null].filter(Boolean).join(" ")}` : ""}`}
      />
      <Form form={form} onSubmit={(report) => submitReport.mutate(report)}>
        <FormErrorAlert
          className="mb-3"
          error={
            trackingOptionsQuery.error ??
            submitReport.error ??
            (draftError ? new Error(draftError) : null)
          }
          fallback="บันทึกผลการติดตามไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
        />
        <ConversationalReportFlow
          isSubmitting={submitReport.isPending}
          onAdvance={async (_stepIndex, step) => {
            if (step.id === "visited-at")
              return await form.trigger(["visitedDate", "visitedTime"]);
            if (step.id === "guardian")
              return await form.trigger([
                "guardianTypeCode",
                "guardianTypeDetail",
              ]);
            if (step.id === "context" && studentNotFound)
              return await form.trigger("causeDetail");
            if (step.id === "residence")
              return await form.trigger([
                "residenceEnvironmentCodes",
                "residenceEnvironmentDetail",
              ]);
            if (step.id === "evidence")
              return await form.trigger([
                "homeVisitExceptionCode",
                "updatedAddressLine",
                "updatedAddressProvince",
                "updatedAddressDistrict",
                "updatedAddressSubDistrict",
                "updatedPostalCode",
              ]);
            return true;
          }}
          steps={steps}
          submitLabel="ส่งรายงานการติดตาม"
        />
      </Form>
      <p className="text-xs text-slate-500">
        ฉบับร่างอยู่เฉพาะ browser/device นี้และลบอัตโนมัติภายใน 24 ชั่วโมง
        {draftSavedAt
          ? ` · บันทึกล่าสุด ${formatThaiDateTime(draftSavedAt)}`
          : ""}
      </p>

      <Dialog onOpenChange={setContactsOpen} open={contactsOpen}>
        <DialogContent
          className="max-w-lg"
          onClose={() => setContactsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle icon={PhoneCall}>ช่องทางติดต่อ</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {contacts.length > 0 ? (
              contacts.map((contact, index) => (
                <div
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                  key={`${contact.phone}-${index}`}
                >
                  <p className="font-semibold">
                    {contact.full_name ||
                      (contact.contact_kind === "STUDENT"
                        ? "นักเรียน"
                        : "ผู้ปกครอง")}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {contact.phone || "ไม่มีเบอร์โทร"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">ยังไม่มีข้อมูลติดต่อ</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setMapOpen} open={mapOpen}>
        <DialogContent className="max-w-5xl" onClose={() => setMapOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={MapPin}>พิกัดบ้านนักเรียน</DialogTitle>
          </DialogHeader>
          <VisitMapPreview
            address={task.student_address}
            lat={task.student_lat}
            lng={task.student_lng}
            markerLabel={task.student_name || "นักเรียน"}
            title={task.student_name || "บ้านนักเรียน"}
          />
        </DialogContent>
      </Dialog>
    </GuestPageShell>
  );
}
