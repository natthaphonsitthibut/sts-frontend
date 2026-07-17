import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Plus, Save, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, type ChangeEvent } from "react";
import { useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
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
  registerField,
  Select,
} from "../../../components/base";
import { ErrorState, PageShell, PageToolbar, SkeletonStack } from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { useStudent } from "../hooks/useStudent";
import { useUpdateStudent } from "../hooks/useUpdateStudent";
import type {
  StudentGuardianRelation,
  StudentUpdatePayload,
} from "../types/students.types";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[0-9]{9,10}$/.test(value), {
    message: "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก",
  });
const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "รูปแบบอีเมลไม่ถูกต้อง",
  });

const GUARDIAN_RELATION_LABELS: Record<StudentGuardianRelation, string> = {
  FATHER: "บิดา",
  MOTHER: "มารดา",
  GUARDIAN: "ผู้ปกครอง",
};

const guardianSchema = z
  .object({
    relation: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
    relation_note: z.string().trim().max(100, "ความสัมพันธ์ยาวเกินไป"),
    full_name: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล").max(200),
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
  address_house_no: z.string().trim().max(100),
  VillageNumber_Onec: z.string().trim().max(100),
  Street_Onec: z.string().trim().max(150),
  Soi_Onec: z.string().trim().max(150),
  Trok_Onec: z.string().trim().max(150),
  ProvinceNameThai_Onec: z.string().trim().max(100),
  DistrictNameThai_Onec: z.string().trim().max(100),
  SubDistrictNameThai_Onec: z.string().trim().max(100),
  PostalCode_Onec: z.string().trim().refine((value) => value === "" || /^\d{5}$/.test(value), "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  address_latitude: nullableLatitude,
  address_longitude: nullableLongitude,
});
type FormValues = z.infer<typeof schema>;

const TEXT_KEYS = [
  "FirstName_Onec", "MiddleName_Onec", "LastName_Onec",
  "address_house_no", "VillageNumber_Onec", "Street_Onec", "Soi_Onec", "Trok_Onec",
  "ProvinceNameThai_Onec", "DistrictNameThai_Onec", "SubDistrictNameThai_Onec",
  "PostalCode_Onec",
] as const;

const EMPTY_VALUES: FormValues = {
  FirstName_Onec: "", MiddleName_Onec: "", LastName_Onec: "",
  address_house_no: "", VillageNumber_Onec: "", Street_Onec: "", Soi_Onec: "", Trok_Onec: "",
  ProvinceNameThai_Onec: "", DistrictNameThai_Onec: "", SubDistrictNameThai_Onec: "",
  PostalCode_Onec: "", address_latitude: null, address_longitude: null,
  contact_phone: "", contact_email: "", contact_line_id: "", guardians: [],
};

type GuardianFormValue = FormValues["guardians"][number];

function emptyGuardian(relation: StudentGuardianRelation): GuardianFormValue {
  return {
    relation,
    relation_note: "",
    full_name: "",
    phone: "",
    email: "",
    line_id: "",
    is_primary: false,
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
          <Phone className="size-5 text-primary" aria-hidden="true" />
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
  const { student, isLoading, isError, refetch } = useStudent(id || undefined);
  const updateStudent = useUpdateStudent(id);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });
  const guardianArray = useFieldArray({ control: form.control, name: "guardians" });
  // Watched so each row can show/hide its ระบุความสัมพันธ์ field as the
  // relation select changes.
  const guardianValues = useWatch({ control: form.control, name: "guardians" });

  function addGuardian(): void {
    const existing = form.getValues("guardians");
    const relation: StudentGuardianRelation = !existing.some((g) => g.relation === "FATHER")
      ? "FATHER"
      : !existing.some((g) => g.relation === "MOTHER")
        ? "MOTHER"
        : "GUARDIAN";
    guardianArray.append({ ...emptyGuardian(relation), is_primary: existing.length === 0 });
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
        form.setValue("PostalCode_Onec", result.postalCode, { shouldDirty: true, shouldValidate: true });
      }
    },
    throwOnError: false,
  });

  useEffect(() => {
    if (!student) return;
    form.reset({
      ...(Object.fromEntries(TEXT_KEYS.map((key) => [key, String(student[key] ?? "")])) as Pick<FormValues, (typeof TEXT_KEYS)[number]>),
      VillageNumber_Onec: stripAddressPrefix("หมู่", student.VillageNumber_Onec),
      Street_Onec: stripAddressPrefix("ถนน", student.Street_Onec),
      Soi_Onec: stripAddressPrefix("ซอย", student.Soi_Onec),
      Trok_Onec: stripAddressPrefix("ตรอก", student.Trok_Onec),
      address_latitude: typeof student.address_latitude === "number" ? student.address_latitude : null,
      address_longitude: typeof student.address_longitude === "number" ? student.address_longitude : null,
      contact_phone: student.contact?.phone ?? "",
      contact_email: student.contact?.email ?? "",
      contact_line_id: student.contact?.line_id ?? "",
      guardians: (student.guardians ?? []).map((guardian) => ({
        relation: guardian.relation,
        relation_note: guardian.relation_note ?? "",
        full_name: guardian.full_name,
        phone: guardian.phone ?? "",
        email: guardian.email ?? "",
        line_id: guardian.line_id ?? "",
        is_primary: guardian.is_primary,
      })),
    });
  }, [form, student]);

  async function submit(values: FormValues): Promise<void> {
    const payload: StudentUpdatePayload = {
      FirstName_Onec: values.FirstName_Onec.trim(),
      MiddleName_Onec: nullable(values.MiddleName_Onec),
      LastName_Onec: values.LastName_Onec.trim(),
      address_house_no: nullable(values.address_house_no),
      VillageNumber_Onec: nullable(stripAddressPrefix("หมู่", values.VillageNumber_Onec)),
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
        relation_note: guardian.relation === "GUARDIAN" ? nullable(guardian.relation_note) : null,
        full_name: guardian.full_name.trim(),
        phone: nullable(guardian.phone),
        email: nullable(guardian.email),
        line_id: nullable(guardian.line_id),
        is_primary: guardian.is_primary,
      })),
    };
    await updateStudent.mutateAsync(payload);
    void navigate(-1);
  }

  return (
    <PageShell>
      <PageToolbar
        footerActions={<NavButton icon={ArrowLeft} to={-1} variant="outline">ย้อนกลับ</NavButton>}
        icon={UserRound}
        title="แก้ไขข้อมูลนักเรียน"
      />
      {isLoading ? <SkeletonStack lines={8} /> : isError || !student ? (
        <ErrorState onRetry={refetch} title="ไม่สามารถโหลดข้อมูลนักเรียน" />
      ) : (
        <Form form={form} onSubmit={submit}>
          <div className="space-y-5">
            <FormErrorAlert error={updateStudent.error} fallback="บันทึกข้อมูลไม่สำเร็จ" />
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound className="size-5 text-primary" aria-hidden="true" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(["FirstName_Onec", "MiddleName_Onec", "LastName_Onec"] as const).map((name, index) => (
                  <FormItem key={name}>
                    <FormLabel htmlFor={name} required={index !== 1}>{["ชื่อ", "ชื่อกลาง", "นามสกุล"][index]}</FormLabel>
                    <Input id={name} {...registerField(form, name)} />
                    <FormMessage<FormValues> name={name} />
                  </FormItem>
                ))}
              </CardContent>
            </Card>
            <AddressFormSection
              catalog={locationQuery.data}
              disabled={updateStudent.isPending}
              form={form}
              geocodeError={geocode.isError ? (
                <FormErrorAlert error={geocode.error} fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่" />
              ) : null}
              isGeocoding={geocode.isPending}
              names={ADDRESS_NAMES}
              onGeocode={async (address) => Boolean(await geocode.mutateAsync(address))}
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
                    disabled={updateStudent.isPending || guardianArray.fields.length >= 10}
                    icon={Plus}
                    onClick={addGuardian}
                    size="sm"
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
                <FormMessage<FormValues> name="guardians" className="min-h-0 empty:hidden" />
                {guardianArray.fields.map((field, index) => {
                  const relation = guardianValues?.[index]?.relation ?? "GUARDIAN";
                  return (
                    <div key={field.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-800">
                          {GUARDIAN_RELATION_LABELS[relation]}
                        </span>
                        <IconButton
                          aria-label="ลบผู้ติดต่อ"
                          disabled={updateStudent.isPending}
                          icon={Trash2}
                          onClick={() => guardianArray.remove(index)}
                          size="sm"
                          variant="outline"
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
                            {...registerField(form, `guardians.${index}.relation`)}
                          >
                            <option value="FATHER">บิดา</option>
                            <option value="MOTHER">มารดา</option>
                            <option value="GUARDIAN">ผู้ปกครอง (อื่น ๆ)</option>
                          </Select>
                          <FormMessage<FormValues> name={`guardians.${index}.relation`} />
                        </FormItem>
                        {relation === "GUARDIAN" ? (
                          <FormItem>
                            <FormLabel htmlFor={`guardians.${index}.relation_note`} required>
                              ระบุความสัมพันธ์
                            </FormLabel>
                            <Input
                              disabled={updateStudent.isPending}
                              id={`guardians.${index}.relation_note`}
                              placeholder="เช่น ยาย ลุง พี่สาว"
                              {...registerField(form, `guardians.${index}.relation_note`)}
                            />
                            <FormMessage<FormValues> name={`guardians.${index}.relation_note`} />
                          </FormItem>
                        ) : null}
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.full_name`} required>
                            ชื่อ-นามสกุล
                          </FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.full_name`}
                            {...registerField(form, `guardians.${index}.full_name`)}
                          />
                          <FormMessage<FormValues> name={`guardians.${index}.full_name`} />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.phone`}>เบอร์โทร</FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.phone`}
                            inputMode="numeric"
                            {...registerField(form, `guardians.${index}.phone`)}
                          />
                          <FormMessage<FormValues> name={`guardians.${index}.phone`} />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.email`}>อีเมล</FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.email`}
                            type="email"
                            {...registerField(form, `guardians.${index}.email`)}
                          />
                          <FormMessage<FormValues> name={`guardians.${index}.email`} />
                        </FormItem>
                        <FormItem>
                          <FormLabel htmlFor={`guardians.${index}.line_id`}>LINE ID</FormLabel>
                          <Input
                            disabled={updateStudent.isPending}
                            id={`guardians.${index}.line_id`}
                            {...registerField(form, `guardians.${index}.line_id`)}
                          />
                          <FormMessage<FormValues> name={`guardians.${index}.line_id`} />
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
                                form.setValue(`guardians.${other}.is_primary`, false);
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
            <div className="flex justify-end">
              <Button icon={Save} isLoading={updateStudent.isPending} loadingText="กำลังบันทึก" type="submit">บันทึกข้อมูล</Button>
            </div>
          </div>
        </Form>
      )}
    </PageShell>
  );
}
