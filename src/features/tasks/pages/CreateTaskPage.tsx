import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  ClipboardList,
  FilePlus2,
  History,
  Link2,
  MapPin,
  Plus,
  UserPlus,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  DatePicker,
  DateTimePicker,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  registerField,
  Textarea,
  TimePicker,
} from "../../../components/base";
import {
  ChoiceCardButton,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { joinNameParts } from "../../../lib/person-name";
import { toRoomOption } from "../../../lib/room-presentation";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { cn } from "../../../lib/utils";
import { taskService } from "../api/task.service";
import { useCreateFollowerRecruitmentCampaign } from "../../field-followers/hooks/useFollowerRecruitmentCampaigns";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { StudentPicker, type SelectedStudent } from "../components/StudentPicker";
import {
  addressTextValue,
  joinAddressParts,
  prefixedAddressPart,
  stripAddressPrefix,
} from "../../../components/address/address-format";
import { studentsService } from "../../students/api/students.service";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import { usePeriodTimes, useRoomSubjects, useTimetableSlots } from "../../timetable/hooks/useTimetable";
import {
  DAY_LABELS,
  formatTimetableSlotLabel,
  getPeriodTimeLabel,
} from "../../timetable/lib/period-times";
import {
  buildTaskResultLink,
  formatDateTime,
  formatDateTimeRangeAge,
} from "../lib/task-presentation";
import {
  TASK_DURATION_UNIT_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../lib/task-options";
import type { TaskCreatePayload, TaskCreateResponse, TaskType } from "../types/task.types";

type ActiveTaskType = Exclude<TaskType, "LOGIN">;
type CreateLinkType = ActiveTaskType | "RECRUITMENT";
/** URL slug ↔ task type, so each link type is its own route (/create/:type). */
const PATH_TO_TYPE: Record<string, CreateLinkType> = {
  visit: "VISIT",
  attendance: "ATTENDANCE",
  recruitment: "RECRUITMENT",
};
const TYPE_TO_PATH: Record<CreateLinkType, string> = {
  VISIT: "visit",
  ATTENDANCE: "attendance",
  RECRUITMENT: "recruitment",
};

const CREATE_LINK_TYPE_OPTIONS: Array<{
  label: string;
  value: CreateLinkType;
  description: string;
}> = [
  ...TASK_TYPE_OPTIONS,
  {
    value: "RECRUITMENT",
    label: "ลิงก์รับสมัคร",
    description: "เปิดรับสมัคร อสม./ผู้ติดตามภาคสนาม",
  },
];

function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}

function addDuration(date: Date, value: number, unit: string): Date {
  const next = new Date(date);
  if (unit === "minutes") {
    next.setMinutes(next.getMinutes() + value);
  } else if (unit === "hours") {
    next.setHours(next.getHours() + value);
  } else if (unit === "weeks") {
    next.setDate(next.getDate() + value * 7);
  } else {
    next.setDate(next.getDate() + value);
  }
  return next;
}

function getLocalDateTimeParts(date: Date): { date: string; time: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function combineLocalDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function toSlotDayOfWeek(date: Date): number {
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

function toBangkokDateOnly(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function dateRangeIncludesDayOfWeek(start: Date, end: Date, dayOfWeek: number): boolean {
  const cursor = toBangkokDateOnly(start);
  const last = toBangkokDateOnly(end);
  while (cursor.getTime() <= last.getTime()) {
    if (toSlotDayOfWeek(cursor) === dayOfWeek) {
      return true;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}

const createTaskSchema = z
  .object({
    task_type: z.enum(["VISIT", "ATTENDANCE"]),
    assigned_to_first_name: z.string().trim(),
    assigned_to_last_name: z.string().trim(),
    assigned_to_email: z.string().trim(),
    assigned_teacher_user_id: z.string().trim(),
    role: z.string().trim(),
    student_name: z.string().trim(),
    student_first_name: z.string().trim(),
    student_last_name: z.string().trim(),
    student_school: z.string().trim(),
    student_address: z.string().trim(),
    address_line: z.string().trim(),
    address_house_no: z.string().trim(),
    address_village_no: z.string().trim(),
    address_street: z.string().trim(),
    address_soi: z.string().trim(),
    address_trok: z.string().trim(),
    address_province: z.string().trim(),
    address_district: z.string().trim(),
    address_sub_district: z.string().trim(),
    postal_code: z.string().trim(),
    address_latitude: nullableLatitude,
    address_longitude: nullableLongitude,
    reason_flagged: z.string().trim(),
    subject_id: z.string().trim(),
    timetable_slot_ids: z.array(z.string()),
    expires_value: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
        "อายุลิงก์ต้องเป็นจำนวนเต็มมากกว่า 0",
      ),
    expires_unit: z.string().min(1),
    opens_at: z.string().trim(),
    assignment_start_date: z.string().trim(),
    assignment_start_time: z.string().trim(),
    assignment_end_date: z.string().trim(),
    assignment_end_time: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.task_type === "VISIT") {
      if (!values.assigned_teacher_user_id) {
        ctx.addIssue({
          code: "custom",
          path: ["assigned_teacher_user_id"],
          message: "กรุณาเลือกครูผู้รับมอบหมาย",
        });
      }
    } else if (!values.assigned_to_email) {
      ctx.addIssue({
        code: "custom",
        path: ["assigned_to_email"],
        message: "กรุณากรอกอีเมลผู้รับมอบหมาย",
      });
    } else if (!isEmail(values.assigned_to_email)) {
      ctx.addIssue({
        code: "custom",
        path: ["assigned_to_email"],
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }
    if (values.task_type === "VISIT") {
      if (!values.student_name) {
        ctx.addIssue({
          code: "custom",
          path: ["student_name"],
          message: "กรุณาเลือกหรือกรอกชื่อนักเรียน",
        });
      }
      if (!values.student_school) {
        ctx.addIssue({
          code: "custom",
          path: ["student_school"],
          message: "กรุณาเลือกโรงเรียน",
        });
      }
      if (values.postal_code && !/^[0-9]{5}$/.test(values.postal_code)) {
        ctx.addIssue({
          code: "custom",
          path: ["postal_code"],
          message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
        });
      }
      if (!values.reason_flagged) {
        ctx.addIssue({
          code: "custom",
          path: ["reason_flagged"],
          message: "กรุณากรอกเหตุผล",
        });
      }
      const assignmentFields = [
        ["assignment_start_date", values.assignment_start_date, "กรุณาเลือกวันที่เริ่ม"],
        ["assignment_start_time", values.assignment_start_time, "กรุณาเลือกเวลาเริ่ม"],
        ["assignment_end_date", values.assignment_end_date, "กรุณาเลือกวันที่สิ้นสุด"],
        ["assignment_end_time", values.assignment_end_time, "กรุณาเลือกเวลาสิ้นสุด"],
      ] as const;
      assignmentFields.forEach(([field, value, message]) => {
        if (!value) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      });
      if (assignmentFields.every(([, value]) => Boolean(value))) {
        const startsAt = combineLocalDateTime(
          values.assignment_start_date,
          values.assignment_start_time,
        );
        const endsAt = combineLocalDateTime(
          values.assignment_end_date,
          values.assignment_end_time,
        );
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
          ctx.addIssue({
            code: "custom",
            path: ["assignment_start_date"],
            message: "ช่วงเวลามอบหมายไม่ถูกต้อง",
          });
        } else if (endsAt.getTime() <= startsAt.getTime()) {
          ctx.addIssue({
            code: "custom",
            path: ["assignment_end_time"],
            message: "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม",
          });
        } else if (endsAt.getTime() <= Date.now()) {
          ctx.addIssue({
            code: "custom",
            path: ["assignment_end_time"],
            message: "วันและเวลาสิ้นสุดต้องอยู่ในอนาคต",
          });
        }
      }
    }
    if (values.task_type === "ATTENDANCE" && !values.subject_id) {
      ctx.addIssue({ code: "custom", path: ["subject_id"], message: "กรุณาเลือกวิชา" });
    }
    if (values.opens_at) {
      const opensAt = new Date(values.opens_at);
      if (Number.isNaN(opensAt.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["opens_at"],
          message: "รูปแบบเวลาเปิดใช้งานไม่ถูกต้อง",
        });
      }
      const expiresValue = Number(values.expires_value);
      if (Number.isInteger(expiresValue) && expiresValue >= 1) {
        const expiresAt = addDuration(new Date(), expiresValue, values.expires_unit);
        if (opensAt.getTime() >= expiresAt.getTime()) {
          ctx.addIssue({
            code: "custom",
            path: ["opens_at"],
            message: "เวลาเปิดใช้งานต้องอยู่ก่อนเวลาหมดอายุของลิงก์",
          });
        }
      }
    }
  });

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

const recruitmentCampaignSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณาระบุชื่อลิงก์รับสมัคร").max(200),
    description: z.string().trim().max(1000).optional(),
    opensOn: z.string(),
    closesOn: z.string(),
  })
  .refine((value) => !value.opensOn || !value.closesOn || value.opensOn <= value.closesOn, {
    message: "วันปิดรับสมัครต้องไม่ก่อนวันเปิดรับสมัคร",
    path: ["closesOn"],
  });

type RecruitmentCampaignFormValues = z.infer<typeof recruitmentCampaignSchema>;

/** Pre-fill passed from the case dashboard's "สร้างลิงก์" action (a flagged student). */
interface VisitPrefill {
  existing_case_id?: string | number;
  student_id?: string | null;
  student_name?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  reason_flagged?: string | null;
  assigned_to_name?: string | null;
  assigned_to_phone?: string | null;
  assigned_to_email?: string | null;
  source_field_follower_id?: string | number | null;
  campaign_target_id?: string | number | null;
  follow_up_request_id?: string | null;
  target_school_id?: string | number | null;
}

function makeDefaults(type: ActiveTaskType): CreateTaskFormValues {
  const assignmentStart = new Date();
  const assignmentEnd = addDuration(assignmentStart, 7, "days");
  const startParts = getLocalDateTimeParts(assignmentStart);
  const endParts = getLocalDateTimeParts(assignmentEnd);
  return {
    task_type: type,
    assigned_to_first_name: "",
    assigned_to_last_name: "",
    assigned_to_email: "",
    assigned_teacher_user_id: "",
    role: "",
    student_name: "",
    student_first_name: "",
    student_last_name: "",
    student_school: "",
    student_address: "",
    address_line: "",
    address_house_no: "",
    address_village_no: "",
    address_street: "",
    address_soi: "",
    address_trok: "",
    address_province: "",
    address_district: "",
    address_sub_district: "",
    postal_code: "",
    address_latitude: null,
    address_longitude: null,
    reason_flagged: "",
    subject_id: "",
    timetable_slot_ids: [],
    expires_value: "7",
    expires_unit: "days",
    opens_at: "",
    assignment_start_date: startParts.date,
    assignment_start_time: startParts.time,
    assignment_end_date: endParts.date,
    assignment_end_time: endParts.time,
  };
}

/**
 * The actual create form for one task type. Mounted with `key={type}` so it
 * starts fresh whenever the type (route) changes — no manual state syncing.
 */
function CreateTaskTypeForm({ type }: { type: ActiveTaskType }) {
  const [result, setResult] = useState<TaskCreateResponse | null>(null);
  const location = useLocation();
  const prefill =
    type === "VISIT"
      ? ((location.state as { prefill?: VisitPrefill } | null)?.prefill ?? null)
      : null;
  // Same school → grade → room cascade as the check-in page, locked to the
  // creator's own scope so every link type stays inside their allowed area.
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter();
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(
    prefill?.student_name
      ? {
          personId: prefill.student_id ?? null,
          name: prefill.student_name,
          firstName: null,
          lastName: null,
          school: prefill.student_school ?? "",
          schoolId:
            prefill.target_school_id === null || prefill.target_school_id === undefined
              ? null
              : String(prefill.target_school_id),
        }
      : null,
  );
  // Guards the async student-detail fetch in prefill so a stale response cannot
  // overwrite a newer student selection.
  const addressRequestVersionRef = useRef(0);
  const assigneeNameParts = (prefill?.assigned_to_name ?? "").trim().split(/\s+/).filter(Boolean);

  const form = useForm<CreateTaskFormValues>({
    defaultValues: {
      ...makeDefaults(type),
      assigned_to_first_name: assigneeNameParts[0] ?? "",
      assigned_to_last_name: assigneeNameParts.slice(1).join(" "),
      assigned_to_email: prefill?.assigned_to_email ?? "",
      student_name: prefill?.student_name ?? "",
      address_line: prefill?.student_address ?? "",
      student_school: prefill?.student_school ?? "",
      student_address: prefill?.student_address ?? "",
      reason_flagged: prefill?.reason_flagged ?? "",
    },
    resolver: zodResolver(createTaskSchema),
  });
  const expiresValue = useWatch({ control: form.control, name: "expires_value" });
  const expiresUnit = useWatch({ control: form.control, name: "expires_unit" });
  const opensAt = useWatch({ control: form.control, name: "opens_at" });
  const assignmentStartDate = useWatch({
    control: form.control,
    name: "assignment_start_date",
  });
  const assignmentStartTime = useWatch({
    control: form.control,
    name: "assignment_start_time",
  });
  const assignmentEndDate = useWatch({
    control: form.control,
    name: "assignment_end_date",
  });
  const assignmentEndTime = useWatch({
    control: form.control,
    name: "assignment_end_time",
  });
  const selectedTeacherUserId = useWatch({
    control: form.control,
    name: "assigned_teacher_user_id",
  });
  const visitAssigneesQuery = useQuery({
    queryKey: ["visit-assignees", selectedStudent?.personId],
    queryFn: () => taskService.getVisitAssignees(selectedStudent!.personId!),
    enabled: type === "VISIT" && Boolean(selectedStudent?.personId),
  });
  const visitAssignees = useMemo(
    () => visitAssigneesQuery.data ?? [],
    [visitAssigneesQuery.data],
  );
  useEffect(() => {
    if (type !== "VISIT" || visitAssignees.length === 0) return;
    const currentIsAvailable = visitAssignees.some(
      (teacher) => String(teacher.teacherUserId) === selectedTeacherUserId,
    );
    if (currentIsAvailable) return;
    const defaultTeacher = visitAssignees.find((teacher) => teacher.isHomeroom) ?? visitAssignees[0];
    form.setValue("assigned_teacher_user_id", String(defaultTeacher.teacherUserId), {
      shouldValidate: form.formState.isSubmitted,
    });
  }, [form, selectedTeacherUserId, type, visitAssignees]);
  const roomSubjectsFilter =
    type === "ATTENDANCE" && scope.schoolId && scope.gradeLevelId && scope.room
      ? {
          schoolId: Number(scope.schoolId),
          gradeLevelId: scope.gradeLevelId,
          roomNo: Number(scope.room),
        }
      : null;
  const roomSubjectsQuery = useRoomSubjects(roomSubjectsFilter);
  const timetableSlotsQuery = useTimetableSlots(roomSubjectsFilter);
  const periodTimesQuery = usePeriodTimes(roomSubjectsFilter?.schoolId ?? null);
  const periodTimes = periodTimesQuery.data?.data ?? [];
  const subjectId = useWatch({ control: form.control, name: "subject_id" });
  const selectedSlotIds = useWatch({ control: form.control, name: "timetable_slot_ids" });
  // A room change invalidates any previously picked subject_id from a
  // different room — clear it instead of silently submitting a stale id.
  useEffect(() => {
    form.setValue("subject_id", "");
    form.setValue("timetable_slot_ids", []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSubjectsFilter?.schoolId, roomSubjectsFilter?.gradeLevelId, roomSubjectsFilter?.roomNo]);
  useEffect(() => {
    form.setValue("timetable_slot_ids", []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);
  const subjectSlots = (timetableSlotsQuery.data?.data ?? [])
    .filter((slot) => String(slot.subject_id) === subjectId)
    .sort((a, b) => a.day_of_week - b.day_of_week || a.period - b.period);
  const selectedSlots = subjectSlots.filter((slot) => selectedSlotIds.includes(String(slot.id)));
  const expiryWarning = (() => {
    if (selectedSlots.length === 0) {
      return null;
    }
    const numericValue = Number(expiresValue);
    if (!Number.isInteger(numericValue) || numericValue < 1) {
      return null;
    }
    const now = new Date();
    const expiresAt = addDuration(now, numericValue, expiresUnit);
    const outsideSlots = selectedSlots.filter(
      (slot) => !dateRangeIncludesDayOfWeek(now, expiresAt, slot.day_of_week),
    );
    if (outsideSlots.length === 0) {
      return null;
    }
    const labels = outsideSlots
      .map((slot) => `วัน${DAY_LABELS[slot.day_of_week] ?? slot.day_of_week} คาบ ${slot.period}`)
      .join(", ");
    return `ลิงก์อายุ ${numericValue} ${
      TASK_DURATION_UNIT_OPTIONS.find((option) => option.value === expiresUnit)?.label ?? expiresUnit
    } อาจหมดอายุก่อนถึง ${labels}`;
  })();

  // ATTENDANCE must target at least a school, otherwise there is no roster to check.
  const locationError =
    type === "ATTENDANCE"
      ? !scope.schoolId
        ? "กรุณาเลือกโรงเรียน"
        : !scope.grade
          ? "กรุณาเลือกระดับชั้น"
          : !scope.room
            ? "กรุณาเลือกห้อง"
            : null
      : null;
  const submitBlockError = locationError;

  const createTask = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: setResult,
    throwOnError: false,
  });

  function startNewTask(): void {
    addressRequestVersionRef.current += 1;
    setResult(null);
    form.reset(makeDefaults(type));
    setSelectedStudent(null);
    scope.reset();
  }

  function handleStudentChange(next: SelectedStudent | null): void {
    const requestVersion = addressRequestVersionRef.current + 1;
    addressRequestVersionRef.current = requestVersion;
    setSelectedStudent(next);
    form.setValue("assigned_teacher_user_id", "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_name", next?.name ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_first_name", next?.firstName ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_last_name", next?.lastName ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_school", next?.school ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_address", "");
    form.setValue("address_house_no", "");
    form.setValue("address_village_no", "");
    form.setValue("address_street", "");
    form.setValue("address_soi", "");
    form.setValue("address_trok", "");
    form.setValue("address_province", "");
    form.setValue("address_district", "");
    form.setValue("address_sub_district", "");
    form.setValue("postal_code", "");
    form.setValue("address_latitude", null);
    form.setValue("address_longitude", null);
    if (next?.personId) {
      void prefillStudentAddress(next.personId, requestVersion);
    }
  }

  // Pull the student's stored home address so the visit form prefills it. The
  // address stays editable (in case the student moved before the record is
  // updated). Replaces the old "current location" button, which captured the
  // creator's GPS — not the student's home.
  async function prefillStudentAddress(
    studentId: string,
    requestVersion: number,
  ): Promise<void> {
    try {
      const detail = await studentsService.getStudentById(studentId);
      if (requestVersion !== addressRequestVersionRef.current) {
        return;
      }

      const houseNo = addressTextValue(detail.address_house_no);
      const addressLine = joinAddressParts([
        houseNo,
        prefixedAddressPart("หมู่ ", detail.VillageNumber_Onec),
        prefixedAddressPart("ตรอก", detail.Trok_Onec),
        prefixedAddressPart("ซอย", detail.Soi_Onec),
        prefixedAddressPart("ถนน", detail.Street_Onec),
      ]);
      const province = addressTextValue(detail.ProvinceNameThai_Onec);
      const district = addressTextValue(detail.DistrictNameThai_Onec);
      const subDistrict = addressTextValue(detail.SubDistrictNameThai_Onec);
      const storedPostalCode = addressTextValue(detail.PostalCode_Onec);
      const structuredAddress = joinAddressParts([
        addressLine,
        subDistrict,
        district,
        province,
        storedPostalCode,
      ]);
      const fallbackAddress = typeof detail.address === "string" ? detail.address.trim() : "";
      const fullAddress = structuredAddress || fallbackAddress;

      form.setValue("student_address", fullAddress);
      form.setValue("address_house_no", houseNo);
      form.setValue("address_village_no", stripAddressPrefix("หมู่", detail.VillageNumber_Onec));
      form.setValue("address_street", stripAddressPrefix("ถนน", detail.Street_Onec));
      form.setValue("address_soi", stripAddressPrefix("ซอย", detail.Soi_Onec));
      form.setValue("address_trok", stripAddressPrefix("ตรอก", detail.Trok_Onec));
      form.setValue("address_province", province);
      form.setValue("address_district", district);
      form.setValue("address_sub_district", subDistrict);
      form.setValue("postal_code", storedPostalCode);
      // Clear any stale pin so the new address snapshot is not mixed with old data.
      form.setValue("address_latitude", null);
      form.setValue("address_longitude", null);
    } catch {
      // Keep the cleared editable fields; the user can enter an unlisted address manually.
    }
  }

  // A case stores an immutable address snapshot, but the visit form needs the
  // structured current enrollment fields (house, moo, road and location
  // cascade) rather than one combined line. Loading the scoped student detail
  // here also repairs legacy/demo cases whose snapshot predates those fields.
  useEffect(() => {
    if (!prefill?.student_id) return;
    const requestVersion = addressRequestVersionRef.current + 1;
    addressRequestVersionRef.current = requestVersion;
    void prefillStudentAddress(prefill.student_id, requestVersion);
    // Route-state prefill is immutable for this mounted task-type form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.student_id]);

  function handleValid(values: CreateTaskFormValues): void {
    if (
      type === "VISIT" &&
      selectedStudent &&
      !selectedStudent.personId &&
      (!values.student_first_name || !values.student_last_name)
    ) {
      form.setError("student_name", {
        type: "manual",
        message: "กรุณากรอกชื่อและนามสกุล",
      });
      document
        .getElementById("create-task-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (submitBlockError) {
      document
        .getElementById("create-task-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const visitStartsAt =
      type === "VISIT"
        ? combineLocalDateTime(values.assignment_start_date, values.assignment_start_time)
        : null;
    const visitEndsAt =
      type === "VISIT"
        ? combineLocalDateTime(values.assignment_end_date, values.assignment_end_time)
        : null;
    const payload: TaskCreatePayload = {
      task_type: type,
      type,
      assigned_to_name: joinNameParts([
        values.assigned_to_first_name,
        values.assigned_to_last_name,
      ]),
      assigned_to_first_name: values.assigned_to_first_name,
      assigned_to_last_name: values.assigned_to_last_name,
      assigned_to_email: values.assigned_to_email || null,
      assigned_to_phone: prefill?.assigned_to_phone ?? null,
      expires_value: Number(values.expires_value) || 1,
      expires_unit: values.expires_unit as TaskCreatePayload["expires_unit"],
      opens_at:
        visitStartsAt && !Number.isNaN(visitStartsAt.getTime())
          ? visitStartsAt.toISOString()
          : values.opens_at
            ? new Date(values.opens_at).toISOString()
            : null,
      expires_at:
        visitEndsAt && !Number.isNaN(visitEndsAt.getTime()) ? visitEndsAt.toISOString() : undefined,
    };

    if (type === "VISIT") {
      const studentName =
        joinNameParts([values.student_first_name, values.student_last_name]) || values.student_name;
      const composedAddressLine = joinAddressParts([
        values.address_house_no,
        prefixedAddressPart("หมู่ ", stripAddressPrefix("หมู่", values.address_village_no)),
        prefixedAddressPart("ตรอก", stripAddressPrefix("ตรอก", values.address_trok)),
        prefixedAddressPart("ซอย", stripAddressPrefix("ซอย", values.address_soi)),
        prefixedAddressPart("ถนน", stripAddressPrefix("ถนน", values.address_street)),
      ]);
      const studentAddress =
        joinAddressParts([
          composedAddressLine,
          values.address_sub_district,
          values.address_district,
          values.address_province,
          values.postal_code,
        ]) || values.student_address;

      Object.assign(payload, {
        assigned_teacher_user_id: values.assigned_teacher_user_id
          ? Number(values.assigned_teacher_user_id)
          : null,
        student_name: studentName,
        student_first_name: values.student_first_name || null,
        student_last_name: values.student_last_name || null,
        student_id: selectedStudent?.personId ?? null,
        student_school: values.student_school || null,
        target_school_id: selectedStudent?.schoolId ? Number(selectedStudent.schoolId) : null,
        student_address: studentAddress || null,
        address_line: composedAddressLine || null,
        address_province: values.address_province || null,
        address_district: values.address_district || null,
        address_sub_district: values.address_sub_district || null,
        postal_code: values.postal_code || null,
        student_lat: values.address_latitude ?? null,
        student_lng: values.address_longitude ?? null,
        reason_flagged: values.reason_flagged || null,
        existing_case_id: prefill?.existing_case_id ? String(prefill.existing_case_id) : null,
        follow_up_request_id: prefill?.follow_up_request_id ?? null,
        source_field_follower_id: prefill?.source_field_follower_id ?? null,
        campaign_target_id: prefill?.campaign_target_id ?? null,
      });
    }

    if (type === "ATTENDANCE") {
      const selectedSubject = (roomSubjectsQuery.data?.data ?? []).find(
        (subject) => String(subject.subject_id) === values.subject_id,
      );
      Object.assign(payload, {
        subject: selectedSubject?.name_th ?? null,
        subject_id: values.subject_id ? Number(values.subject_id) : null,
        timetable_slot_ids: values.timetable_slot_ids.map(Number),
        target_grade: scope.grade,
        target_room: scope.room,
        target_school_id: scope.schoolId ? Number(scope.schoolId) : null,
      });
    }

    createTask.mutate(payload);
  }

  if (result) {
    const publicLink = buildTaskResultLink(result.magic_link, false);
    return (
      <Card>
        <CardHeader>
          <CardTitle>สร้างลิงก์สำเร็จ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertTitle>Magic link พร้อมใช้งาน</AlertTitle>
            <AlertDescription>
              หมดอายุ {formatDateTime(result.expires_at)} · อายุ{" "}
              {formatDateTimeRangeAge(new Date().toISOString(), result.expires_at)}
            </AlertDescription>
          </Alert>
          <LinkShareActions
            link={publicLink}
            showRawLink={false}
            trailing={
              <Button icon={Plus} onClick={startNewTask}>
                สร้างรายการใหม่
              </Button>
            }
          />
          {result.qr_code_data ? (
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <img alt="QR Code" className="mx-auto size-48" src={result.qr_code_data} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (type === "VISIT") {
    const selectedTeacher = visitAssignees.find(
      (teacher) => String(teacher.teacherUserId) === selectedTeacherUserId,
    );

    return (
      <Form form={form} onSubmit={handleValid}>
        <div className="space-y-5">
          <Card className="p-5" id="create-task-detail">
            <div className="mb-5 flex items-center gap-2 text-base font-bold text-slate-900">
              <UserRound className="size-5 text-primary" aria-hidden="true" />
              ข้อมูลนักเรียน
            </div>
            <FormErrorAlert
              error={createTask.error}
              fallback="สร้างลิงก์ไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
            />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <FormItem>
                <FormLabel required>นักเรียน</FormLabel>
                <StudentPicker
                  disabled={createTask.isPending}
                  onChange={handleStudentChange}
                  value={selectedStudent}
                />
                <FormMessage<CreateTaskFormValues> name="student_name" />
                <FormMessage<CreateTaskFormValues> name="student_school" />
              </FormItem>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {selectedStudent?.name || "เลือกนักเรียนเพื่อเริ่มติดตาม"}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {selectedStudent?.school || "ระบบจะแสดงเฉพาะครูของโรงเรียนนี้"}
                    </p>
                  </div>
                </div>
                <FormItem className="mt-4">
                  <FormLabel htmlFor="reason_flagged" required>
                    หมายเหตุ
                  </FormLabel>
                  <Textarea
                    id="reason_flagged"
                    placeholder="คำอธิบายเพิ่มเติม"
                    rows={3}
                    {...registerField(form, "reason_flagged")}
                  />
                  <FormMessage<CreateTaskFormValues> name="reason_flagged" />
                </FormItem>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                ขั้นตอนการติดตาม
              </div>
              <span className="text-sm font-semibold text-slate-700">
                สถานะการติดตาม: <span className={getCaseTrackingStatusPresentation("OPEN").textClassName}>รอมอบหมาย</span>
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[112px_minmax(0,1fr)]">
              <div className="flex items-center gap-3 lg:flex-col lg:items-center lg:pt-12">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white shadow-sm">
                  1
                </span>
                <span className="font-bold text-slate-800">มอบหมาย</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormItem>
                    <FormLabel htmlFor="assignment-start-date" required>วันที่เริ่ม</FormLabel>
                    <DatePicker
                      ariaLabel="วันที่เริ่มงาน"
                      id="assignment-start-date"
                      onChange={(value) =>
                        form.setValue("assignment_start_date", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      value={assignmentStartDate}
                    />
                    <FormMessage<CreateTaskFormValues> name="assignment_start_date" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="assignment-start-time" required>เวลาเริ่ม</FormLabel>
                    <TimePicker
                      ariaLabel="เวลาเริ่มงาน"
                      id="assignment-start-time"
                      onChange={(value) =>
                        form.setValue("assignment_start_time", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      value={assignmentStartTime}
                    />
                    <FormMessage<CreateTaskFormValues> name="assignment_start_time" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="assignment-end-date" required>วันที่สิ้นสุด</FormLabel>
                    <DatePicker
                      ariaLabel="วันที่สิ้นสุดงาน"
                      id="assignment-end-date"
                      onChange={(value) =>
                        form.setValue("assignment_end_date", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      value={assignmentEndDate}
                    />
                    <FormMessage<CreateTaskFormValues> name="assignment_end_date" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="assignment-end-time" required>เวลาสิ้นสุด</FormLabel>
                    <TimePicker
                      ariaLabel="เวลาสิ้นสุดงาน"
                      id="assignment-end-time"
                      onChange={(value) =>
                        form.setValue("assignment_end_time", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      value={assignmentEndTime}
                    />
                    <FormMessage<CreateTaskFormValues> name="assignment_end_time" />
                  </FormItem>
                  <FormItem className="md:col-span-2">
                    <FormLabel required>ครูผู้รับมอบหมาย</FormLabel>
                    <Combobox
                      disabled={!selectedStudent?.personId || visitAssigneesQuery.isLoading}
                      emptyText="ไม่พบครูที่พร้อมรับมอบหมายในโรงเรียนนี้"
                      onChange={(value) =>
                        form.setValue("assigned_teacher_user_id", value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        })
                      }
                      options={visitAssignees.map((teacher) => ({
                        value: String(teacher.teacherUserId),
                        label: `${teacher.displayName}${teacher.isHomeroom ? " (ครูประจำชั้น)" : ""}`,
                      }))}
                      placeholder={
                        selectedStudent?.personId
                          ? "เลือกครูผู้รับมอบหมาย"
                          : "เลือกนักเรียนก่อน"
                      }
                      value={selectedTeacherUserId}
                    />
                    <FormMessage<CreateTaskFormValues> name="assigned_teacher_user_id" />
                    {selectedTeacher?.isHomeroom ? (
                      <p className="text-xs text-primary">เลือกครูประจำชั้นเป็นค่าเริ่มต้น</p>
                    ) : null}
                  </FormItem>
                  <div className="md:col-span-2 flex items-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    <History className="mr-2 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    ลิงก์จะส่งให้ครูที่เลือก และเปิดใช้งานภายในช่วงเวลานี้
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              isLoading={createTask.isPending}
              loadingText="กำลังสร้าง"
              size="lg"
              type="submit"
            >
              สร้างลิงก์
            </Button>
          </div>
        </div>
      </Form>
    );
  }

  return (
    <Form form={form} onSubmit={handleValid}>
      <Card id="create-task-detail">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FilePlus2 className="size-5 text-primary" aria-hidden="true" />
            รายละเอียด
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormErrorAlert
            error={createTask.error}
            fallback="สร้างลิงก์ไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="assigned_to_first_name" required>
                ชื่อผู้รับมอบหมาย
              </FormLabel>
              <Input
                id="assigned_to_first_name"
                {...registerField(form, "assigned_to_first_name")}
              />
              <FormMessage<CreateTaskFormValues> name="assigned_to_first_name" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="assigned_to_last_name" required>
                นามสกุลผู้รับมอบหมาย
              </FormLabel>
              <Input
                id="assigned_to_last_name"
                {...registerField(form, "assigned_to_last_name")}
              />
              <FormMessage<CreateTaskFormValues> name="assigned_to_last_name" />
            </FormItem>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="assigned_to_email" required>
                อีเมล
              </FormLabel>
              <Input
                id="assigned_to_email"
                type="email"
                {...registerField(form, "assigned_to_email")}
              />
              <FormMessage<CreateTaskFormValues> name="assigned_to_email" />
            </FormItem>
          </div>

          {type === "ATTENDANCE" ? (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-900">พื้นที่</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormItem>
                  <FormLabel>จังหวัด</FormLabel>
                  <Combobox
                    disabled={createTask.isPending || scope.schoolLocked}
                    onChange={(next) => {
                      area.setProvince(next);
                      scope.setSchoolId("");
                    }}
                    options={[
                      { value: "", label: "ทุกจังหวัด" },
                      ...area.provinces.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ค้นหาจังหวัด"
                    value={area.province}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel>อำเภอ/เขต</FormLabel>
                  <Combobox
                    disabled={createTask.isPending || scope.schoolLocked || !area.province}
                    onChange={(next) => {
                      area.setDistrict(next);
                      scope.setSchoolId("");
                    }}
                    options={[
                      { value: "", label: "ทุกอำเภอ/เขต" },
                      ...area.districts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ค้นหาอำเภอ/เขต"
                    value={area.district}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel>ตำบล/แขวง</FormLabel>
                  <Combobox
                    disabled={createTask.isPending || scope.schoolLocked || !area.district}
                    onChange={(next) => {
                      area.setSubDistrict(next);
                      scope.setSchoolId("");
                    }}
                    options={[
                      { value: "", label: "ทุกตำบล/แขวง" },
                      ...area.subDistricts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ค้นหาตำบล/แขวง"
                    value={area.subDistrict}
                  />
                </FormItem>
              </div>
              <h4 className="pt-1 text-sm font-extrabold text-slate-900">ห้องเรียนและวิชา</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel required>โรงเรียน</FormLabel>
                  <Combobox
                    aria-invalid={
                      !scope.schoolId && form.formState.isSubmitted ? true : undefined
                    }
                    disabled={scope.schoolLocked}
                    emptyText={
                      area.schoolsEnabled
                        ? "ไม่พบโรงเรียน"
                        : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง"
                    }
                    onChange={(next) => {
                      scope.setSchoolId(next);
                      const school = area.filteredSchools.find(
                        (candidate) => String(candidate.id) === next,
                      );
                      area.setAreaFromSchool(school);
                    }}
                    onSearchChange={area.setSchoolSearch}
                    options={[
                      { value: "", label: "เลือกโรงเรียน" },
                      ...area.filteredSchools.map((school) => ({
                        value: String(school.id),
                        label: school.name,
                      })),
                    ]}
                    placeholder="ค้นหาโรงเรียน"
                    value={scope.schoolId}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required>ระดับชั้น</FormLabel>
                  <Combobox
                    aria-invalid={
                      Boolean(scope.schoolId) && !scope.grade && form.formState.isSubmitted
                        ? true
                        : undefined
                    }
                    disabled={!scope.schoolId || scope.gradeLocked}
                    onChange={(next) => scope.setGrade(next)}
                    options={[
                      { value: "", label: "เลือกชั้น" },
                      ...scope.gradeLevels.map((grade) => ({
                        value: grade.label,
                        label: grade.label,
                      })),
                    ]}
                    placeholder="ค้นหาชั้น"
                    value={scope.grade}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required>ห้อง</FormLabel>
                  <Combobox
                    aria-invalid={
                      Boolean(scope.grade) && !scope.room && form.formState.isSubmitted
                        ? true
                        : undefined
                    }
                    disabled={!scope.grade || scope.roomLocked}
                    onChange={(next) => scope.setRoom(next)}
                    options={[
                      { value: "", label: "เลือกห้อง" },
                      ...scope.rooms.map(toRoomOption),
                    ]}
                    placeholder="ค้นหาห้อง"
                    value={scope.room}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="subject_id" required>
                    วิชา
                  </FormLabel>
                  <Combobox
                    aria-invalid={form.formState.errors.subject_id ? true : undefined}
                    disabled={!roomSubjectsFilter}
                    emptyText={
                      roomSubjectsFilter
                        ? "ห้องนี้ยังไม่มีวิชาในตารางสอน — เพิ่มได้ที่หน้า “ตารางสอน”"
                        : "เลือกโรงเรียน ชั้น และห้องก่อน"
                    }
                    id="subject_id"
                    onChange={(next) =>
                      form.setValue("subject_id", next, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    options={[
                      { value: "", label: "เลือกวิชา" },
                      ...(roomSubjectsQuery.data?.data ?? []).map((subject) => ({
                        value: String(subject.subject_id),
                        label: subject.name_th,
                      })),
                    ]}
                    placeholder="ค้นหาวิชา"
                    value={subjectId}
                  />
                  <FormMessage<CreateTaskFormValues> name="subject_id" />
                </FormItem>
                <FormItem className="sm:col-span-2">
                  <FormLabel>คาบ</FormLabel>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    {!roomSubjectsFilter ? (
                      <p className="text-sm text-slate-500">เลือกโรงเรียน ชั้น และห้องก่อน</p>
                    ) : !subjectId ? (
                      <p className="text-sm text-slate-500">เลือกวิชาก่อนเลือกคาบ</p>
                    ) : subjectSlots.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        วิชานี้ยังไม่มีคาบในตารางสอน — เว้นว่างเพื่อสร้างลิงก์เช็คชื่อรายวัน
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {subjectSlots.map((slot) => {
                          const value = String(slot.id);
                          const checked = selectedSlotIds.includes(value);
                          return (
                            <Checkbox
                              checked={checked}
                              disabled={createTask.isPending}
                              key={slot.id}
                              label={formatTimetableSlotLabel(slot, periodTimes)}
                              onChange={(event) => {
                                const next = event.currentTarget.checked
                                  ? [...selectedSlotIds, value]
                                  : selectedSlotIds.filter((id) => id !== value);
                                form.setValue("timetable_slot_ids", next, {
                                  shouldDirty: true,
                                  shouldValidate: form.formState.isSubmitted,
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    เว้นว่าง = เช็คชื่อรายวันปกติ / เลือกคาบ = เช็คชื่อเฉพาะคาบวิชานี้
                  </p>
                  {expiryWarning ? (
                    <Alert variant="warning">
                      <AlertDescription>{expiryWarning}</AlertDescription>
                    </Alert>
                  ) : null}
                  {selectedSlots.length > 0 ? (
                    <p className="text-xs text-slate-500">
                      เวลาคาบอ้างอิง:{" "}
                      {selectedSlots
                        .map(
                          (slot) =>
                            `คาบ ${slot.period} ${getPeriodTimeLabel(periodTimes, slot.day_of_week, slot.period)}`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </FormItem>
              </div>
              <p
                className={cn(
                  "min-h-5 text-sm font-medium text-red-600",
                  !(locationError && form.formState.isSubmitted) && "invisible",
                )}
              >
                {locationError && form.formState.isSubmitted ? locationError : "."}
              </p>
            </div>
          ) : null}
          <>
              <div className="grid gap-x-4 sm:grid-cols-[1fr_160px]">
                <FormItem>
                  <FormLabel htmlFor="expires_value" required>
                    อายุลิงก์
                  </FormLabel>
                  <NumericInput
                    id="expires_value"
                    maxLength={4}
                    {...registerField(form, "expires_value")}
                  />
                  <FormMessage<CreateTaskFormValues> name="expires_value" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="expires_unit">หน่วย</FormLabel>
                  <Combobox
                    id="expires_unit"
                    name="expires_unit"
                    onChange={(next) =>
                      form.setValue("expires_unit", next as CreateTaskFormValues["expires_unit"], {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    options={TASK_DURATION_UNIT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    searchable={false}
                    value={expiresUnit}
                  />
                  <FormMessage<CreateTaskFormValues> name="expires_unit" />
                </FormItem>
              </div>

              <FormItem>
                <FormLabel htmlFor="opens_at">เปิดใช้งานเมื่อ (ไม่บังคับ)</FormLabel>
                <DateTimePicker
                  ariaLabel="เปิดใช้งานเมื่อ"
                  id="opens_at"
                  onChange={(next) => form.setValue("opens_at", next, { shouldValidate: true })}
                  value={opensAt}
                />
                <p className="text-xs text-slate-500">
                  เว้นว่าง = เปิดใช้งานทันที · ตั้งเวลาไว้ = ลิงก์จะใช้ไม่ได้จนถึงเวลานั้น
                  (สถานะ “รอเปิด”)
                </p>
                <FormMessage<CreateTaskFormValues> name="opens_at" />
              </FormItem>
          </>

          <div className="flex justify-end">
            <Button
              isLoading={createTask.isPending}
              loadingText="กำลังสร้าง"
              size="lg"
              type="submit"
            >
              สร้างลิงก์
            </Button>
          </div>
        </CardContent>
      </Card>
    </Form>
  );
}

function buildFollowerRecruitmentUrl(publicCode: string): string {
  return `${window.location.origin}/apply/field-follower/${publicCode}`;
}

function CreateRecruitmentCampaignForm() {
  const area = useSchoolAreaFilter();
  const createCampaign = useCreateFollowerRecruitmentCampaign();
  const form = useForm<RecruitmentCampaignFormValues>({
    defaultValues: { name: "", description: "", opensOn: "", closesOn: "" },
    resolver: zodResolver(recruitmentCampaignSchema),
  });
  const opensOn = useWatch({ control: form.control, name: "opensOn" });
  const closesOn = useWatch({ control: form.control, name: "closesOn" });
  const result = createCampaign.data?.data ?? null;

  function startNewCampaign(): void {
    createCampaign.reset();
    form.reset({ name: "", description: "", opensOn: "", closesOn: "" });
  }

  function handleSubmit(values: RecruitmentCampaignFormValues): void {
    const hasAreaScope = Boolean(area.province || area.district || area.subDistrict);
    createCampaign.mutate({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      data_scope: hasAreaScope
        ? {
            provinces: area.province ? [area.province] : undefined,
            districts: area.district ? [area.district] : undefined,
            sub_districts: area.subDistrict ? [area.subDistrict] : undefined,
          }
        : undefined,
      opens_at: values.opensOn || undefined,
      closes_at: values.closesOn || undefined,
    });
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>สร้างลิงก์รับสมัครสำเร็จ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertTitle>ลิงก์รับสมัครพร้อมใช้งาน</AlertTitle>
            <AlertDescription>
              {result.name} · {result.is_open ? "เปิดรับสมัครแล้ว" : "ยังไม่อยู่ในช่วงรับสมัคร"}
            </AlertDescription>
          </Alert>
          <LinkShareActions
            link={buildFollowerRecruitmentUrl(result.public_code)}
            trailing={
              <Button icon={Plus} onClick={startNewCampaign}>
                สร้างรายการใหม่
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Card id="create-recruitment-link-detail">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-primary" aria-hidden="true" />
            รายละเอียดลิงก์รับสมัคร
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormErrorAlert
            error={createCampaign.error}
            fallback="สร้างลิงก์รับสมัครไม่สำเร็จ"
          />

          <FormItem>
            <FormLabel htmlFor="campaign-name" required>
              ชื่อลิงก์
            </FormLabel>
            <Input
              id="campaign-name"
              placeholder="เช่น รับสมัคร อสม. อำเภอเมือง รุ่น 1"
              {...form.register("name")}
            />
            <FormMessage<RecruitmentCampaignFormValues> name="name" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="campaign-description">รายละเอียด (ถ้ามี)</FormLabel>
            <Textarea id="campaign-description" rows={3} {...form.register("description")} />
            <FormMessage<RecruitmentCampaignFormValues> name="description" />
          </FormItem>

          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Combobox
                onChange={area.setProvince}
                options={[
                  { value: "", label: "ทุกจังหวัด" },
                  ...area.provinces.map((name) => ({ value: name, label: name })),
                ]}
                placeholder="จังหวัด"
                value={area.province}
              />
              <Combobox
                disabled={!area.province}
                onChange={area.setDistrict}
                options={[
                  { value: "", label: "ทุกอำเภอ/เขต" },
                  ...area.districts.map((name) => ({ value: name, label: name })),
                ]}
                placeholder="อำเภอ/เขต"
                value={area.district}
              />
              <Combobox
                disabled={!area.district}
                onChange={area.setSubDistrict}
                options={[
                  { value: "", label: "ทุกตำบล/แขวง" },
                  ...area.subDistricts.map((name) => ({ value: name, label: name })),
                ]}
                placeholder="ตำบล/แขวง"
                value={area.subDistrict}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="campaign-opens-on">เปิดรับสมัครตั้งแต่</FormLabel>
              <DatePicker
                ariaLabel="เปิดรับสมัครตั้งแต่"
                id="campaign-opens-on"
                max={closesOn || undefined}
                onChange={(next) => form.setValue("opensOn", next, { shouldValidate: true })}
                value={opensOn}
              />
              <FormMessage<RecruitmentCampaignFormValues> name="opensOn" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="campaign-closes-on">ปิดรับสมัครวันที่</FormLabel>
              <DatePicker
                ariaLabel="ปิดรับสมัครวันที่"
                id="campaign-closes-on"
                min={opensOn || undefined}
                onChange={(next) => form.setValue("closesOn", next, { shouldValidate: true })}
                value={closesOn}
              />
              <FormMessage<RecruitmentCampaignFormValues> name="closesOn" />
            </FormItem>
          </div>

          <div className="flex justify-end">
            <Button
              isLoading={createCampaign.isPending}
              loadingText="กำลังสร้าง"
              size="lg"
              type="submit"
            >
              สร้างลิงก์
            </Button>
          </div>
        </CardContent>
      </Card>
    </Form>
  );
}

export function CreateTaskPage() {
  const { type: typeParam } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const activeType = typeParam ? PATH_TO_TYPE[typeParam.toLowerCase()] : undefined;

  function chooseType(next: CreateLinkType): void {
    // Clicking the already-selected type again deselects it (back to chooser).
    void navigate(activeType === next ? "/create" : `/create/${TYPE_TO_PATH[next]}`);
  }

  if (activeType === "VISIT") {
    return (
      <PageShell>
        <PageToolbar
          icon={ClipboardList}
          title="ติดตามนักเรียน"
        />
        <CreateTaskTypeForm type="VISIT" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        icon={FilePlus2}
        title="สร้างลิงก์"
        description="เลือกประเภทและกรอกข้อมูลที่จำเป็น"
      />
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {CREATE_LINK_TYPE_OPTIONS.map(({ value, label, description }) => {
            const Icon =
              value === "VISIT"
                ? MapPin
                : value === "ATTENDANCE"
                  ? UserRoundCheck
                  : value === "RECRUITMENT"
                    ? UserPlus
                    : Link2;
            return (
              <ChoiceCardButton
                description={description}
                icon={Icon}
                key={value}
                onClick={() => chooseType(value)}
                selected={activeType === value}
                title={label}
              />
            );
          })}
        </div>

        {activeType && activeType !== "RECRUITMENT" ? (
          <CreateTaskTypeForm key={activeType} type={activeType} />
        ) : null}
        {activeType === "RECRUITMENT" ? <CreateRecruitmentCampaignForm /> : null}
      </div>
    </PageShell>
  );
}
