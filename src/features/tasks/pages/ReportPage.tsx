import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  History,
  LocateFixed,
  MapPin,
  PhoneCall,
  Save,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import { z } from "zod";
import {
  Avatar,
  Button,
  buttonVariants,
  Card,
  CardContent,
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
  IconButton,
  Input,
  registerField,
  Textarea,
  TimePicker,
} from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useCaseTrackingOptions } from "../../cases/hooks/useCaseTrackingOptions";
import { getGuardianRelationLabel } from "../../students/lib/guardian-relation-presentation";
import { attendanceLookupService } from "../api/attendance-lookup.service";
import { taskService } from "../api/task.service";
import { buildVisitReportFormTitle } from "../lib/task-presentation";
import { VisitMapPreview } from "../components/VisitMapPreview";
import { VisitPhotoUpload } from "../components/VisitPhotoUpload";

const reportSchema = z
  .object({
    visitedDate: z.string().trim().min(1, "กรุณาเลือกวันที่ลงพื้นที่"),
    visitedTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลาที่ลงพื้นที่"),
    assessmentCode: z.string().trim().min(1, "กรุณาเลือกผลประเมินหลังลงพื้นที่"),
    causeDetail: z.string().trim(),
    homeVisitExceptionCode: z.string().trim(),
    updatedAddressLine: z.string().trim(),
    updatedAddressProvince: z.string().trim(),
    updatedAddressDistrict: z.string().trim(),
    updatedAddressSubDistrict: z.string().trim(),
    updatedPostalCode: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.homeVisitExceptionCode === "STUDENT_NOT_FOUND" && !values.causeDetail) {
      context.addIssue({
        code: "custom",
        message: "กรุณาระบุรายละเอียดเมื่อไม่พบนักเรียน",
        path: ["causeDetail"],
      });
    }
    if (values.homeVisitExceptionCode !== "ADDRESS_CHANGED") return;

    const requiredAddressFields: Array<
      [
        keyof Pick<
          typeof values,
          | "updatedAddressLine"
          | "updatedAddressProvince"
          | "updatedAddressDistrict"
          | "updatedAddressSubDistrict"
          | "updatedPostalCode"
        >,
        string,
      ]
    > = [
      ["updatedAddressLine", "กรุณากรอกที่อยู่ใหม่"],
      ["updatedAddressProvince", "กรุณากรอกจังหวัด"],
      ["updatedAddressDistrict", "กรุณากรอกอำเภอ/เขต"],
      ["updatedAddressSubDistrict", "กรุณากรอกตำบล/แขวง"],
      ["updatedPostalCode", "กรุณากรอกรหัสไปรษณีย์"],
    ];
    requiredAddressFields.forEach(([field, message]) => {
      if (!values[field]) {
        context.addIssue({ code: "custom", message, path: [field] });
      }
    });
    if (values.updatedPostalCode && !/^\d{5}$/.test(values.updatedPostalCode)) {
      context.addIssue({
        code: "custom",
        message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
        path: ["updatedPostalCode"],
      });
    }
  });

type ReportFormValues = z.infer<typeof reportSchema>;

function getLocalDateTimeParts(date = new Date()): { date: string; time: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function parseDateTimeParts(value?: string | null): { date: string; time: string } {
  if (!value) return { date: "-", time: "-" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };
  const local = getLocalDateTimeParts(parsed);
  const [year, month, day] = local.date.split("-");
  return { date: `${day}/${month}/${year}`, time: local.time };
}

function formatHistoryDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
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

interface ReadOnlyFieldProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}

function ReadOnlyField({ icon: Icon, label, value }: ReadOnlyFieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
        <Icon className="size-4 shrink-0 text-slate-500" aria-hidden />
        <span className="truncate tabular-nums">{value}</span>
      </div>
    </div>
  );
}

interface FlowStepProps {
  active?: boolean;
  label: string;
  number: number;
}

function FlowStep({ active = false, label, number }: FlowStepProps) {
  return (
    <div className="relative flex flex-col items-center gap-2" data-flow-step={number}>
      <div
        className={cn(
          "relative z-10 grid size-9 place-items-center rounded-full border text-sm font-bold",
          active
            ? "border-primary bg-primary text-white"
            : "border-slate-300 bg-white text-slate-600",
        )}
      >
        {number}
      </div>
      <span className={cn("text-xs font-semibold", active ? "text-slate-900" : "text-slate-600")}>
        {label}
      </span>
    </div>
  );
}

export function ReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [sessionToken, setSessionToken] = useState(() => readMagicToken(token, "local"));
  const initialVisit = useMemo(() => getLocalDateTimeParts(), []);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);

  const form = useForm<ReportFormValues>({
    defaultValues: {
      visitedDate: initialVisit.date,
      visitedTime: initialVisit.time,
      assessmentCode: "",
      causeDetail: "",
      homeVisitExceptionCode: "",
      updatedAddressLine: "",
      updatedAddressProvince: "",
      updatedAddressDistrict: "",
      updatedAddressSubDistrict: "",
      updatedPostalCode: "",
    },
    resolver: zodResolver(reportSchema),
  });
  const visitedDate = useWatch({ control: form.control, name: "visitedDate" });
  const visitedTime = useWatch({ control: form.control, name: "visitedTime" });
  const assessmentCode = useWatch({ control: form.control, name: "assessmentCode" });
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

  const taskQuery = useQuery({
    queryKey: ["report-task", token, sessionToken],
    queryFn: () => taskService.getTask(token, sessionToken || undefined),
    enabled: Boolean(token),
    retry: false,
  });
  const trackingOptionsQuery = useCaseTrackingOptions();
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
    const status = taskQuery.error as {
      response?: { status?: number; data?: { status?: string } };
    };
    if (status?.response?.status === 410 || status?.response?.data?.status === "EXPIRED") {
      void navigate(`/task/${token}/expired`, { replace: true });
    }
  }, [navigate, taskQuery.error, token]);

  const submitReport = useMutation({
    mutationFn: (values: ReportFormValues) => {
      const visitedAt = new Date(`${values.visitedDate}T${values.visitedTime}:00`);
      const formData = new FormData();
      formData.set("visited_at", visitedAt.toISOString());
      formData.set("follow_up_assessment_code", values.assessmentCode);
      formData.set("cause_detail", values.causeDetail);
      formData.set("case_follow_up_decision", "REQUEST_REVIEW");
      formData.set("visit_lat", lat);
      formData.set("visit_lng", lng);
      if (values.homeVisitExceptionCode) {
        formData.set("home_visit_exception_code", values.homeVisitExceptionCode);
      }
      if (values.homeVisitExceptionCode === "ADDRESS_CHANGED") {
        formData.set("address_changed", "true");
        formData.set("updated_address_line", values.updatedAddressLine);
        formData.set("updated_address_province", values.updatedAddressProvince);
        formData.set("updated_address_district", values.updatedAddressDistrict);
        formData.set("updated_address_sub_district", values.updatedAddressSubDistrict);
        formData.set("updated_postal_code", values.updatedPostalCode);
        formData.set("updated_lat", lat);
        formData.set("updated_lng", lng);
      }
      photos.forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(token, formData, sessionToken || undefined);
    },
    onSuccess: () => {
      // Carry the heading over: the link is COMPLETED once this returns, so the
      // receipt page can no longer read the student/term context from the task.
      void navigate(`/task/${token}/success?type=visit`, {
        replace: true,
        state: taskQuery.data ? { formTitle: buildVisitReportFormTitle(taskQuery.data) } : undefined,
      });
    },
  });

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

  if (taskQuery.isLoading) {
    return (
      <GuestPageShell contentClassName="max-w-[1120px]">
        <Card className="rounded-lg p-6">
          <SkeletonStack lines={8} />
        </Card>
      </GuestPageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <GuestPageShell contentClassName="max-w-[760px]">
        <Card className="rounded-lg p-6">
          <FormErrorAlert error={taskQuery.error} fallback="ไม่สามารถโหลดแบบฟอร์มติดตามได้" />
        </Card>
      </GuestPageShell>
    );
  }

  const task = taskQuery.data;
  if (task.auth_required) {
    return (
      <MagicAuthCard title="ยืนยันตัวตน" subtitle={task.assigned_to_name || "แบบฟอร์มติดตามนักเรียน"}>
        <OtpVerifyPanel
          onRequestOtp={() => taskService.requestTaskOtp(token)}
          onVerifyOtp={async (otp) => {
            const response = await taskService.verifyTaskOtp(token, otp);
            if (!response.session_token) {
              throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
            }
            writeMagicToken(token, response.session_token, "local");
            setSessionToken(response.session_token);
          }}
        />
      </MagicAuthCard>
    );
  }

  const assignmentStart = parseDateTimeParts(task.opens_at || task.created_at);
  const assignmentEnd = parseDateTimeParts(task.expires_at);
  const studentClass = [task.student_grade, task.student_room].filter(Boolean).join("/");
  const formTitle = buildVisitReportFormTitle(task);
  const history = task.follow_up_history ?? [];
  const homeVisitExceptions = trackingOptionsQuery.data?.homeVisitExceptions ?? [];
  const hasHomeCoordinates = task.student_lat != null && task.student_lng != null;
  const contactChannels = getContactChannels(task);

  return (
    <GuestPageShell
      contentClassName="max-w-[1120px] space-y-4"
      profileName={task.assigned_to_name}
    >
      <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">{formTitle}</h1>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserRoundCheck className="size-4.5" aria-hidden="true" />
            ข้อมูลนักเรียน
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="flex min-w-0 gap-3">
              <Avatar
                className="size-20 bg-primary text-xl text-white"
                fallback={task.student_name || undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {task.student_name || "-"} {studentClass || ""}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{task.student_school || "-"}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <IconButton
                      aria-label="ดูเบอร์ติดต่อนักเรียนและผู้ปกครอง"
                      icon={PhoneCall}
                      onClick={() => setContactsOpen(true)}
                      title="ดูเบอร์ติดต่อ"
                      variant="contact"
                    />
                    <IconButton
                      aria-label="ดูพิกัดบ้านนักเรียน"
                      icon={MapPin}
                      onClick={() => setMapOpen(true)}
                      title={hasHomeCoordinates ? "ดูพิกัดบ้านนักเรียน" : "ยังไม่มีพิกัดบ้าน"}
                      variant="location"
                    />
                  </div>
                </div>
                <div className="mt-2 min-h-20 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold text-danger-700">
                    <TriangleAlert className="size-3.5" aria-hidden="true" />
                    สาเหตุที่ต้องติดตาม
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap leading-5">
                    {task.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
                  </p>
                </div>
              </div>
            </div>

            <section
              aria-labelledby="follow-up-history-title"
              className="flex h-full min-h-32 flex-col"
            >
              <div className="mb-2 flex items-center gap-2">
                <History className="size-4.5 text-slate-700" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-800" id="follow-up-history-title">
                  ประวัติการติดตาม
                </h2>
              </div>
              {history.length > 0 ? (
                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {history.map((item, index) => (
                    <li
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                      key={`${item.submitted_at ?? index}:${item.assigned_to_name ?? index}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          ผู้ติดตาม: {item.assigned_to_name || "-"}
                        </span>
                        <span className="tabular-nums text-slate-500">
                          {formatHistoryDate(item.visited_at || item.submitted_at)}
                        </span>
                      </div>
                      {item.exception_label ? (
                        <div className="mt-1 font-semibold text-primary-dark">
                          {item.exception_label}
                        </div>
                      ) : null}
                      <p className="mt-1 line-clamp-2">{item.cause_detail || "ไม่มีคำอธิบาย"}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex min-h-20 flex-1 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  ยังไม่มีประวัติการติดตามก่อนหน้า
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>

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
        <DialogContent className="max-w-lg" onClose={() => setContactsOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={PhoneCall}>ช่องทางติดต่อนักเรียนและผู้ปกครอง</DialogTitle>
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
                      {(contact.full_name || getContactRelationLabel(contact)).slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {contact.full_name || "-"}
                        </span>
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-primary">
                          {getContactRelationLabel(contact)}
                          {contact.is_primary && contact.contact_kind === "GUARDIAN"
                            ? " · ผู้ติดต่อหลัก"
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1 text-sm tabular-nums text-slate-600">{phone}</div>
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
              <PhoneCall className="mb-2 size-8 text-slate-400" aria-hidden="true" />
              <div className="text-sm font-semibold text-slate-700">ยังไม่มีเบอร์ติดต่อ</div>
              <p className="mt-1 text-xs text-slate-500">
                ไม่พบเบอร์ของนักเรียนหรือผู้ปกครองในข้อมูลปัจจุบัน
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <ClipboardList className="size-4.5" aria-hidden="true" />
              ขั้นตอนการติดตาม
            </div>
            <div className="text-xs font-semibold text-slate-600">
              สถานะการติดตาม: <span className="text-primary">รอติดตาม</span>
            </div>
          </div>

          <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 gap-y-4 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-x-5">
            <div className="relative flex items-center justify-center">
              <div
                className="absolute bottom-[-1rem] left-1/2 top-1/2 w-px -translate-x-1/2 bg-slate-200"
                aria-hidden="true"
              />
              <FlowStep label="มอบหมาย" number={1} />
            </div>
            <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField icon={CalendarDays} label="วันที่เริ่ม" value={assignmentStart.date} />
                  <ReadOnlyField icon={Clock} label="เวลาเริ่ม" value={assignmentStart.time} />
                  <ReadOnlyField
                    icon={UserRoundCheck}
                    label="ผู้รับมอบหมาย"
                    value={task.assigned_to_name || "-"}
                  />
                  <ReadOnlyField icon={CalendarDays} label="วันที่สิ้นสุด" value={assignmentEnd.date} />
                  <ReadOnlyField icon={Clock} label="เวลาสิ้นสุด" value={assignmentEnd.time} />
                  <div className="md:col-span-1">
                    <div className="mb-1 text-xs font-semibold text-slate-600">ที่อยู่ปัจจุบัน</div>
                    <div className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      {task.student_address || "-"}
                    </div>
                  </div>
                </div>
                {task.can_delegate ? (
                  <div className="mt-4 flex justify-end">
                    <Link
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      to={`/task/${token}/delegate`}
                    >
                      มอบหมายให้ผู้อื่น
                    </Link>
                  </div>
                ) : null}
            </section>

            <div className="relative flex items-start justify-center pt-[14.5rem]">
              <div
                className="absolute left-1/2 top-[-1rem] h-[16.625rem] w-px -translate-x-1/2 bg-slate-200"
                aria-hidden="true"
              />
              <FlowStep active label="ติดตาม" number={2} />
            </div>
            <section className="min-w-0 rounded-lg border border-primary/60 bg-[#edf4ff] p-4">
                <Form form={form} onSubmit={(values) => submitReport.mutate(values)}>
                  <div className="space-y-4">
                    <FormErrorAlert
                      error={trackingOptionsQuery.error ?? submitReport.error}
                      fallback="บันทึกผลการติดตามไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                    />

                    <div className="grid items-stretch gap-4 lg:grid-cols-2">
                      <div className="grid h-full gap-4 lg:grid-rows-[auto_auto_minmax(0,1fr)]">
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
                            <FormMessage<ReportFormValues> name="visitedDate" />
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
                            <FormMessage<ReportFormValues> name="visitedTime" />
                          </FormItem>
                        </div>

                        <FormItem>
                          <FormLabel htmlFor="follow-up-assessment" required>
                            ผลประเมินหลังลงพื้นที่
                          </FormLabel>
                          <Combobox
                            aria-invalid={form.formState.errors.assessmentCode ? true : undefined}
                            id="follow-up-assessment"
                            name="assessmentCode"
                            onChange={(value) =>
                              form.setValue("assessmentCode", value, {
                                shouldDirty: true,
                                shouldValidate: form.formState.isSubmitted,
                              })
                            }
                            options={[
                              { value: "", label: "เลือกผลประเมินหลังลงพื้นที่" },
                              ...(trackingOptionsQuery.data?.homeVisitAssessments ?? []).map(
                                (option) => ({
                                value: option.code,
                                label: option.label,
                                }),
                              ),
                            ]}
                            searchable={false}
                            value={assessmentCode}
                          />
                          <FormMessage<ReportFormValues> name="assessmentCode" />
                        </FormItem>

                        <FormItem className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-2 space-y-0">
                          <FormLabel
                            htmlFor="cause-detail"
                            required={homeVisitExceptionCode === "STUDENT_NOT_FOUND"}
                          >
                            คำอธิบายเพิ่มเติม
                          </FormLabel>
                          <Textarea
                            className="h-full min-h-28 bg-white"
                            id="cause-detail"
                            placeholder={
                              homeVisitExceptionCode === "STUDENT_NOT_FOUND"
                                ? "ระบุบริเวณที่ตรวจสอบ บุคคลที่สอบถาม และแนวทางติดตามครั้งถัดไป"
                                : "บันทึกรายละเอียดจากการลงพื้นที่"
                            }
                            {...registerField(form, "causeDetail")}
                          />
                          <FormMessage<ReportFormValues> name="causeDetail" />
                        </FormItem>
                      </div>

                      <div className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
                        <FormLabel className="mb-1.5">แนบไฟล์</FormLabel>
                        <div className="min-h-52">
                          <VisitPhotoUpload
                            className="h-full"
                            dropzoneClassName="h-full min-h-52"
                            files={photos}
                            onChange={setPhotos}
                          />
                        </div>
                        <div className="mt-2 min-h-5" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="border-t border-primary/20 pt-3">
                      <fieldset
                        className="flex flex-wrap items-center gap-x-6 gap-y-2"
                        data-home-visit-exceptions
                      >
                        <legend className="sr-only">กรณีพิเศษที่พบ</legend>
                        <span className="mr-1 text-xs font-semibold text-slate-700" aria-hidden="true">
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
                      <div className="space-y-3">
                        <div className="grid items-stretch gap-4 lg:h-[180px] lg:grid-cols-2">
                          <FormItem className="flex h-full flex-col gap-2 space-y-0">
                          <FormLabel htmlFor="updated-address-line" required>
                            ที่อยู่ใหม่
                          </FormLabel>
                          <Textarea
                            className="min-h-36 flex-1 bg-white lg:min-h-0"
                            id="updated-address-line"
                            placeholder="บ้านเลขที่ หมู่ ถนน ซอย หรือรายละเอียดจุดสังเกต"
                            {...registerField(form, "updatedAddressLine")}
                          />
                          <FormMessage<ReportFormValues> name="updatedAddressLine" />
                          </FormItem>
                          <div className="grid h-full gap-3 sm:grid-cols-2 sm:grid-rows-2">
                          <FormItem className="grid grid-rows-[auto_2.5rem_auto] gap-2 space-y-0">
                            <FormLabel htmlFor="updated-address-province" required>
                              จังหวัด
                            </FormLabel>
                            <Combobox
                              aria-invalid={
                                form.formState.errors.updatedAddressProvince ? true : undefined
                              }
                              disabled={locationCatalogQuery.isLoading}
                              id="updated-address-province"
                              name="updatedAddressProvince"
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
                            <FormMessage<ReportFormValues> name="updatedAddressProvince" />
                          </FormItem>
                          <FormItem className="grid grid-rows-[auto_2.5rem_auto] gap-2 space-y-0">
                            <FormLabel htmlFor="updated-address-district" required>
                              อำเภอ/เขต
                            </FormLabel>
                            <Combobox
                              aria-invalid={
                                form.formState.errors.updatedAddressDistrict ? true : undefined
                              }
                              disabled={!updatedAddressProvince || locationCatalogQuery.isLoading}
                              id="updated-address-district"
                              name="updatedAddressDistrict"
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
                            <FormMessage<ReportFormValues> name="updatedAddressDistrict" />
                          </FormItem>
                          <FormItem className="grid grid-rows-[auto_2.5rem_auto] gap-2 space-y-0">
                            <FormLabel htmlFor="updated-address-sub-district" required>
                              ตำบล/แขวง
                            </FormLabel>
                            <Combobox
                              aria-invalid={
                                form.formState.errors.updatedAddressSubDistrict ? true : undefined
                              }
                              disabled={!updatedAddressDistrict || locationCatalogQuery.isLoading}
                              id="updated-address-sub-district"
                              name="updatedAddressSubDistrict"
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
                            <FormMessage<ReportFormValues> name="updatedAddressSubDistrict" />
                          </FormItem>
                          <FormItem className="grid grid-rows-[auto_2.5rem_auto] gap-2 space-y-0">
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
                            <FormMessage<ReportFormValues> name="updatedPostalCode" />
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
                            <p className="text-xs font-medium text-danger-700" role="alert">
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

                    <div className="flex justify-end border-t border-primary/20 pt-3">
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
                </Form>
            </section>
          </div>
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}
