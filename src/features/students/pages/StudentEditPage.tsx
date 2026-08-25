import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  GraduationCap,
  IdCard,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  IconButton,
  Input,
  EMPTY_PHOTO_PICKER_VALUE,
  PersonIcon,
  PhotoPicker,
  registerField,
  Select,
  type PhotoPickerValue,
} from "../../../components/base";
import {
  ErrorState,
  FormActions,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import {
  createBreadcrumbNavigationState,
  useSafeBackTarget,
} from "../../../components/layout/navigation-context";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { GUARDIAN_RELATION_LABELS } from "../lib/guardian-relation-presentation";
import { useStudent } from "../hooks/useStudent";
import { useUpdateStudent } from "../hooks/useUpdateStudent";
import type {
  StudentGuardianRelation,
  StudentUpdatePayload,
} from "../types/students.types";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { studentsService } from "../api/students.service";
import { useStudentStatuses } from "../../student-statuses/hooks/useStudentStatuses";
import { maskSensitiveIdentifier } from "../../../lib/pii-presentation";
import { SensitiveValueToggleButton } from "../../../components/security/SensitiveValueToggleButton";
import { useTimedSensitiveReveal } from "../../../hooks/useTimedSensitiveReveal";
import { PII_FIELD_LABELS } from "../pii.constants";
import { StudentPiiRevealDialog } from "../components/StudentPiiRevealDialog";
import type {
  StudentPiiField,
  StudentPiiRevealResponse,
} from "../types/students.types";

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[0-9]{9,10}$/.test(value), {
    message: "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก",
  });
const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    {
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    },
  );

const guardianSchema = z
  .object({
    relation: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
    relation_note: z.string().trim().max(100, "ความสัมพันธ์ยาวเกินไป"),
    first_name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
    last_name: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100),
    phone: optionalPhone,
    email: optionalEmail,
    line_id: z.string().trim().max(64, "LINE ID ยาวเกินไป"),
    is_primary: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.relation === "GUARDIAN" && value.relation_note.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "กรุณาระบุว่าผู้ปกครองเกี่ยวข้องเป็นอะไร",
        path: ["relation_note"],
      });
    }
  });

const schema = z.object({
  contact_phone: optionalPhone,
  contact_email: optionalEmail,
  contact_line_id: z.string().trim().max(64, "LINE ID ยาวเกินไป"),
  guardians: z.array(guardianSchema).max(10, "เพิ่มผู้ติดต่อได้สูงสุด 10 คน"),
  FirstName_Onec: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  MiddleName_Onec: z.string().trim().max(100),
  LastName_Onec: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100),
  student_number: z.string().trim().max(50),
  student_status_code: z.string(),
  term_gpa: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (Number(value) >= 0 && Number(value) <= 4),
      "เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00–4.00",
    ),
  address_house_no: z.string().trim().max(100),
  VillageNumber_Onec: z.string().trim().max(100),
  Street_Onec: z.string().trim().max(150),
  Soi_Onec: z.string().trim().max(150),
  Trok_Onec: z.string().trim().max(150),
  ProvinceNameThai_Onec: z.string().trim().max(100),
  DistrictNameThai_Onec: z.string().trim().max(100),
  SubDistrictNameThai_Onec: z.string().trim().max(100),
  PostalCode_Onec: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{5}$/.test(value),
      "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
    ),
  address_latitude: nullableLatitude,
  address_longitude: nullableLongitude,
});
type FormValues = z.infer<typeof schema>;

const TEXT_KEYS = [
  "FirstName_Onec",
  "MiddleName_Onec",
  "LastName_Onec",
  "address_house_no",
  "VillageNumber_Onec",
  "Street_Onec",
  "Soi_Onec",
  "Trok_Onec",
  "ProvinceNameThai_Onec",
  "DistrictNameThai_Onec",
  "SubDistrictNameThai_Onec",
  "PostalCode_Onec",
] as const;

const EMPTY_VALUES: FormValues = {
  FirstName_Onec: "",
  MiddleName_Onec: "",
  LastName_Onec: "",
  student_number: "",
  student_status_code: "",
  term_gpa: "",
  address_house_no: "",
  VillageNumber_Onec: "",
  Street_Onec: "",
  Soi_Onec: "",
  Trok_Onec: "",
  ProvinceNameThai_Onec: "",
  DistrictNameThai_Onec: "",
  SubDistrictNameThai_Onec: "",
  PostalCode_Onec: "",
  address_latitude: null,
  address_longitude: null,
  contact_phone: "",
  contact_email: "",
  contact_line_id: "",
  guardians: [],
};

type GuardianFormValue = FormValues["guardians"][number];

function emptyGuardian(relation: StudentGuardianRelation): GuardianFormValue {
  return {
    relation,
    relation_note: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    line_id: "",
    is_primary: false,
  };
}

function splitLegacyGuardianName(
  fullName: string,
): Pick<GuardianFormValue, "first_name" | "last_name"> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { first_name: parts[0] ?? "", last_name: "" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.at(-1) ?? "",
  };
}

const ADDRESS_NAMES: AddressFieldNames<FormValues> = {
  houseNo: "address_house_no",
  moo: "VillageNumber_Onec",
  street: "Street_Onec",
  soi: "Soi_Onec",
  trok: "Trok_Onec",
  province: "ProvinceNameThai_Onec",
  district: "DistrictNameThai_Onec",
  subDistrict: "SubDistrictNameThai_Onec",
  postalCode: "PostalCode_Onec",
  latitude: "address_latitude",
  longitude: "address_longitude",
};

function nullable(value: string): string | null {
  return value.trim() || null;
}

function StudentContactSection({
  disabled,
  form,
}: {
  disabled: boolean;
  form: UseFormReturn<FormValues>;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="size-5 text-success-700" aria-hidden="true" />
          ช่องทางติดต่อนักเรียน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormItem>
            <FormLabel htmlFor="contact_phone">เบอร์โทร</FormLabel>
            <Input
              disabled={disabled}
              id="contact_phone"
              inputMode="numeric"
              {...registerField(form, "contact_phone")}
            />
            <FormMessage<FormValues> name="contact_phone" />
          </FormItem>
          <FormItem>
            <FormLabel htmlFor="contact_email">อีเมล</FormLabel>
            <Input
              disabled={disabled}
              id="contact_email"
              type="email"
              {...registerField(form, "contact_email")}
            />
            <FormMessage<FormValues> name="contact_email" />
          </FormItem>
          <FormItem>
            <FormLabel htmlFor="contact_line_id">LINE ID</FormLabel>
            <Input
              disabled={disabled}
              id="contact_line_id"
              {...registerField(form, "contact_line_id")}
            />
            <FormMessage<FormValues> name="contact_line_id" />
          </FormItem>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const safeBackTarget = useSafeBackTarget();
  const { student, isLoading, isError, refetch } = useStudent(id || undefined);
  const updateStudent = useUpdateStudent(id);
  const statusesQuery = useStudentStatuses({
    page: 1,
    limit: 50,
    sortBy: "sortOrder",
    sortDirection: "asc",
  });
  const [revealField, setRevealField] = useState<StudentPiiField | null>(null);
  const piiReveal = useTimedSensitiveReveal<StudentPiiField>(id);
  const [photo, setPhoto] = useState<PhotoPickerValue>(
    EMPTY_PHOTO_PICKER_VALUE,
  );
  const updatePhoto = useMutation({
    mutationFn: (input: { photo?: File; remove?: boolean }) =>
      studentsService.updateStudentPhoto(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student", id] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });
  const guardianArray = useFieldArray({
    control: form.control,
    name: "guardians",
  });
  // Watched so each row can show/hide its ระบุความสัมพันธ์ field as the
  // relation select changes.
  const guardianValues = useWatch({ control: form.control, name: "guardians" });

  function addGuardian(): void {
    const existing = form.getValues("guardians");
    const relation: StudentGuardianRelation = !existing.some(
      (g) => g.relation === "FATHER",
    )
      ? "FATHER"
      : !existing.some((g) => g.relation === "MOTHER")
        ? "MOTHER"
        : "GUARDIAN";
    guardianArray.append({
      ...emptyGuardian(relation),
      is_primary: existing.length === 0,
    });
  }

  const locationQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
  });
  const geocode = useMutation({
    meta: { suppressSuccessToast: true },
    mutationFn: geoService.geocodeProfileAddress,
    onSuccess: (result) => {
      if (!result) return;
      form.setValue("address_latitude", result.lat, { shouldDirty: true });
      form.setValue("address_longitude", result.lng, { shouldDirty: true });
      if (result.postalCode) {
        form.setValue("PostalCode_Onec", result.postalCode, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    throwOnError: false,
  });

  useEffect(() => {
    if (!student) return;
    form.reset({
      ...(Object.fromEntries(
        TEXT_KEYS.map((key) => [key, String(student[key] ?? "")]),
      ) as Pick<FormValues, (typeof TEXT_KEYS)[number]>),
      VillageNumber_Onec: stripAddressPrefix(
        "หมู่",
        student.VillageNumber_Onec,
      ),
      Street_Onec: stripAddressPrefix("ถนน", student.Street_Onec),
      Soi_Onec: stripAddressPrefix("ซอย", student.Soi_Onec),
      Trok_Onec: stripAddressPrefix("ตรอก", student.Trok_Onec),
      address_latitude:
        typeof student.address_latitude === "number"
          ? student.address_latitude
          : null,
      address_longitude:
        typeof student.address_longitude === "number"
          ? student.address_longitude
          : null,
      contact_phone: student.contact?.phone ?? "",
      contact_email: student.contact?.email ?? "",
      contact_line_id: student.contact?.line_id ?? "",
      guardians: (student.guardians ?? []).map((guardian) => ({
        relation: guardian.relation,
        relation_note: guardian.relation_note ?? "",
        first_name:
          guardian.first_name ??
          splitLegacyGuardianName(guardian.full_name).first_name,
        last_name:
          guardian.last_name ??
          splitLegacyGuardianName(guardian.full_name).last_name,
        phone: guardian.phone ?? "",
        email: guardian.email ?? "",
        line_id: guardian.line_id ?? "",
        is_primary: guardian.is_primary,
      })),
      student_number: String(student.student_number ?? ""),
      student_status_code: String(student.student_status_code ?? ""),
      term_gpa: String(student.term_gpa ?? ""),
    });
  }, [form, student]);

  async function submit(values: FormValues): Promise<void> {
    const payload: StudentUpdatePayload = {
      FirstName_Onec: values.FirstName_Onec.trim(),
      MiddleName_Onec: nullable(values.MiddleName_Onec),
      LastName_Onec: values.LastName_Onec.trim(),
      student_number: nullable(values.student_number),
      student_status_code: values.student_status_code
        ? Number(values.student_status_code)
        : undefined,
      term_gpa: values.term_gpa === "" ? null : Number(values.term_gpa),
      address_house_no: nullable(values.address_house_no),
      VillageNumber_Onec: nullable(
        stripAddressPrefix("หมู่", values.VillageNumber_Onec),
      ),
      Street_Onec: nullable(stripAddressPrefix("ถนน", values.Street_Onec)),
      Soi_Onec: nullable(stripAddressPrefix("ซอย", values.Soi_Onec)),
      Trok_Onec: nullable(stripAddressPrefix("ตรอก", values.Trok_Onec)),
      ProvinceNameThai_Onec: nullable(values.ProvinceNameThai_Onec),
      DistrictNameThai_Onec: nullable(values.DistrictNameThai_Onec),
      SubDistrictNameThai_Onec: nullable(values.SubDistrictNameThai_Onec),
      PostalCode_Onec: nullable(values.PostalCode_Onec),
      address_latitude: values.address_latitude,
      address_longitude: values.address_longitude,
      contact: {
        phone: nullable(values.contact_phone),
        email: nullable(values.contact_email),
        line_id: nullable(values.contact_line_id),
      },
      // Guardian list is a full replacement.
      guardians: values.guardians.map((guardian) => ({
        relation: guardian.relation,
        relation_note:
          guardian.relation === "GUARDIAN"
            ? nullable(guardian.relation_note)
            : null,
        first_name: guardian.first_name.trim(),
        last_name: guardian.last_name.trim(),
        phone: nullable(guardian.phone),
        email: nullable(guardian.email),
        line_id: nullable(guardian.line_id),
        is_primary: guardian.is_primary,
      })),
    };
    await updateStudent.mutateAsync(payload);
    if (photo.file || photo.removed) {
      await updatePhoto.mutateAsync({
        photo: photo.file ?? undefined,
        remove: photo.removed,
      });
    }
    goBack();
  }

  function goBack(): void {
    if (typeof safeBackTarget === "string") {
      const state = createBreadcrumbNavigationState(location, safeBackTarget);
      void navigate(safeBackTarget, state ? { state } : undefined);
      return;
    }
    void navigate(safeBackTarget);
  }

  function piiValue(field: StudentPiiField): string {
    const revealed = piiReveal.values[field];
    if (piiReveal.visibleFields[field] && revealed !== undefined)
      return revealed;
    return maskSensitiveIdentifier(student?.[field]) || "ไม่ระบุ";
  }

  function togglePii(field: StudentPiiField): void {
    if (piiReveal.visibleFields[field]) {
      piiReveal.hide(field);
    } else if (piiReveal.values[field] !== undefined) {
      piiReveal.showCached(field);
    } else {
      setRevealField(field);
    }
  }

  function handlePiiRevealed(values: StudentPiiRevealResponse["values"]): void {
    piiReveal.reveal(values);
  }

  return (
    <PageShell>
      <PageToolbar
        icon={UserRound}
        navigation={
          <NavButton icon={ArrowLeft} to={safeBackTarget} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="แก้ไขข้อมูลนักเรียน"
      />
      {isLoading ? (
        <SkeletonStack lines={8} />
      ) : isError || !student ? (
        <ErrorState onRetry={refetch} title="ไม่สามารถโหลดข้อมูลนักเรียน" />
      ) : (
        <Form form={form} onSubmit={submit}>
          <div className="space-y-5">
            <FormErrorAlert
              error={updateStudent.error ?? updatePhoto.error}
              fallback="บันทึกข้อมูลไม่สำเร็จ"
            />
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-2">
                <PersonIcon
                  className="size-5 text-slate-700"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-800">
                  ข้อมูลทั่วไป
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
                <PhotoPicker
                  disabled={updateStudent.isPending || updatePhoto.isPending}
                  label="รูปประจำตัวนักเรียน"
                  onChange={setPhoto}
                  storedUrl={resolveApiMediaUrl(student.photo_url ?? null)}
                  value={photo}
                />
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  {(
                    [
                      "FirstName_Onec",
                      "MiddleName_Onec",
                      "LastName_Onec",
                    ] as const
                  ).map((name, index) => (
                    <FormItem key={name}>
                      <FormLabel htmlFor={name} required={index !== 1}>
                        {["ชื่อ", "ชื่อกลาง", "นามสกุล"][index]}
                      </FormLabel>
                      <Input id={name} {...registerField(form, name)} />
                      <FormMessage<FormValues> name={name} />
                    </FormItem>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <IdCard className="size-5 text-slate-700" aria-hidden="true" />
                <h2 className="text-lg font-bold text-slate-800">
                  ข้อมูลระบุตัวตน
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["PersonID_Onec", "PassportNumber_Onec"] as const).map(
                  (field) => {
                    const hasValue =
                      (student.masked_fields ?? []).includes(field) ||
                      Boolean(student[field]);
                    return (
                      <div
                        className="rounded-lg border border-slate-200 px-4 py-3"
                        key={field}
                      >
                        <div className="text-sm text-slate-500">
                          {PII_FIELD_LABELS[field]}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="font-medium tabular-nums text-slate-800">
                            {piiValue(field)}
                          </span>
                          {hasValue ? (
                            <SensitiveValueToggleButton
                              isVisible={
                                piiReveal.visibleFields[field] === true
                              }
                              label={PII_FIELD_LABELS[field]}
                              onClick={() => togglePii(field)}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              <p className="mt-3 text-sm text-slate-500">
                เลขระบุตัวตนเป็นข้อมูลอ่อนไหว การเปิดดูจะถูกบันทึกพร้อมเหตุผล
              </p>
            </Card>
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <GraduationCap
                  className="size-5 text-slate-700"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-800">
                  ข้อมูลการเรียน
                </h2>
              </div>
              <div className="mb-5 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-slate-500">โรงเรียน</span>
                  <div className="mt-1 font-medium text-slate-800">
                    {String(student.school_name ?? "ไม่ระบุ")}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ปี/ภาคเรียน</span>
                  <div className="mt-1 font-medium text-slate-800">
                    {student.AcademicYear_Onec ?? "ไม่ระบุ"}/
                    {student.Semester_Onec ?? "ไม่ระบุ"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ระดับชั้น</span>
                  <div className="mt-1 font-medium text-slate-800">
                    {String(student.grade_label ?? student.grade ?? "ไม่ระบุ")}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ห้อง</span>
                  <div className="mt-1 font-medium text-slate-800">
                    {String(student.room ?? "ไม่ระบุ")}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormItem>
                  <FormLabel htmlFor="student_number">
                    เลขประจำตัวนักเรียน
                  </FormLabel>
                  <Input
                    id="student_number"
                    {...registerField(form, "student_number")}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="student_status_code">
                    สถานะนักเรียน
                  </FormLabel>
                  <Select
                    disabled={statusesQuery.isLoading}
                    id="student_status_code"
                    {...registerField(form, "student_status_code")}
                  >
                    <option value="">ไม่ระบุ</option>
                    {(statusesQuery.data?.items ?? [])
                      .filter((status) => status.isEnabled)
                      .map((status) => (
                        <option key={status.code} value={status.code}>
                          {status.labelTh}
                        </option>
                      ))}
                  </Select>
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="term_gpa">เกรดเฉลี่ยภาคเรียน</FormLabel>
                  <Input
                    id="term_gpa"
                    inputMode="decimal"
                    placeholder="0.00–4.00"
                    {...registerField(form, "term_gpa")}
                  />
                  <FormMessage<FormValues> name="term_gpa" />
                </FormItem>
              </div>
            </Card>
            <AddressFormSection
              catalog={locationQuery.data}
              disabled={updateStudent.isPending}
              form={form}
              geocodeError={
                geocode.isError ? (
                  <FormErrorAlert
                    error={geocode.error}
                    fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                  />
                ) : null
              }
              isGeocoding={geocode.isPending}
              names={ADDRESS_NAMES}
              onGeocode={async (address) =>
                Boolean(await geocode.mutateAsync(address))
              }
              title="ที่อยู่บ้านนักเรียน"
            />
            <StudentContactSection
              disabled={updateStudent.isPending}
              form={form}
            />
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
                  <span className="flex items-center gap-2">
                    <Users className="size-5 text-primary" aria-hidden="true" />
                    ข้อมูลผู้ปกครอง
                  </span>
                  <Button
                    disabled={
                      updateStudent.isPending ||
                      guardianArray.fields.length >= 10
                    }
                    icon={Plus}
                    onClick={addGuardian}
                    type="button"
                    variant="outline"
                  >
                    เพิ่มผู้ติดต่อ
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {guardianArray.fields.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    ยังไม่มีข้อมูลผู้ปกครอง กด &quot;เพิ่มผู้ติดต่อ&quot;
                    เพื่อบันทึกบิดา มารดา หรือผู้ปกครองอื่นพร้อมช่องทางติดต่อ
                  </p>
                ) : null}
                <FormMessage<FormValues>
                  name="guardians"
                  className="min-h-0 empty:hidden"
                />
                {guardianArray.fields.map((field, index) => {
                  const relation =
                    guardianValues?.[index]?.relation ?? "GUARDIAN";
                  return (
                    <div
                      key={field.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-800">
                          {GUARDIAN_RELATION_LABELS[relation]}
                        </span>
                        <IconButton
                          aria-label="ลบผู้ติดต่อ"
                          disabled={updateStudent.isPending}
                          icon={Trash2}
                          onClick={() => guardianArray.remove(index)}
                          title="ลบผู้ติดต่อ"
                          variant="delete"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.relation`}>
                            ความเกี่ยวข้อง
                          </FormLabel>
                          <Select
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.relation`}
                            {...registerField(
                              form,
                              `guardians.${index}.relation`,
                            )}
                          >
                            <option value="FATHER">บิดา</option>
                            <option value="MOTHER">มารดา</option>
                            <option value="GUARDIAN">ผู้ปกครอง (อื่น ๆ)</option>
                          </Select>
                          <FormMessage<FormValues>
                            name={`guardians.${index}.relation`}
                          />
                        </FormItem>
                        {relation === "GUARDIAN" ? (
                          <FormItem>
                            <FormLabel
                              htmlFor={`guardians.${index}.relation_note`}
                              required
                            >
                              ระบุความสัมพันธ์
                            </FormLabel>
                            <Input
                              disabled={updateStudent.isPending}
                              id={`guardians.${index}.relation_note`}
                              placeholder="เช่น ยาย ลุง พี่สาว"
                              {...registerField(
                                form,
                                `guardians.${index}.relation_note`,
                              )}
                            />
                            <FormMessage<FormValues>
                              name={`guardians.${index}.relation_note`}
                            />
                          </FormItem>
                        ) : null}
                        <FormItem>
                          <FormLabel
                            htmlFor={`guardians.${index}.first_name`}
                            required
                          >
                            ชื่อ
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.first_name`}
                            autoComplete="given-name"
                            {...registerField(
                              form,
                              `guardians.${index}.first_name`,
                            )}
                          />
                          <FormMessage<FormValues>
                            name={`guardians.${index}.first_name`}
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel
                            htmlFor={`guardians.${index}.last_name`}
                            required
                          >
                            นามสกุล
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.last_name`}
                            autoComplete="family-name"
                            {...registerField(
                              form,
                              `guardians.${index}.last_name`,
                            )}
                          />
                          <FormMessage<FormValues>
                            name={`guardians.${index}.last_name`}
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.phone`}>
                            เบอร์โทร
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.phone`}
                            inputMode="numeric"
                            {...registerField(form, `guardians.${index}.phone`)}
                          />
                          <FormMessage<FormValues>
                            name={`guardians.${index}.phone`}
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.email`}>
                            อีเมล
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.email`}
                            type="email"
                            {...registerField(form, `guardians.${index}.email`)}
                          />
                          <FormMessage<FormValues>
                            name={`guardians.${index}.email`}
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.line_id`}>
                            LINE ID
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.line_id`}
                            {...registerField(
                              form,
                              `guardians.${index}.line_id`,
                            )}
                          />
                          <FormMessage<FormValues>
                            name={`guardians.${index}.line_id`}
                          />
                        </FormItem>
                      </div>
                      <Checkbox
                        className="mt-1"
                        disabled={updateStudent.isPending}
                        label="ผู้ติดต่อหลัก"
                        {...form.register(`guardians.${index}.is_primary`, {
                          onChange: (event: ChangeEvent<HTMLInputElement>) => {
                            if (!event.target.checked) return;
                            form.getValues("guardians").forEach((_, other) => {
                              if (other !== index) {
                                form.setValue(
                                  `guardians.${other}.is_primary`,
                                  false,
                                );
                              }
                            });
                          },
                        })}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <FormActions>
              <Button
                onClick={goBack}
                size="lg"
                type="button"
                variant="outline"
              >
                ยกเลิก
              </Button>
              <Button
                icon={Save}
                isLoading={updateStudent.isPending || updatePhoto.isPending}
                loadingText="กำลังบันทึก"
                size="lg"
                type="submit"
              >
                บันทึกข้อมูล
              </Button>
            </FormActions>
          </div>
        </Form>
      )}
      {student ? (
        <StudentPiiRevealDialog
          field={revealField}
          maskedValue={revealField ? piiValue(revealField) : ""}
          onOpenChange={(open) => {
            if (!open) setRevealField(null);
          }}
          onRevealed={handlePiiRevealed}
          open={revealField !== null}
          studentId={id}
        />
      ) : null}
    </PageShell>
  );
}
