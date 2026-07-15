import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
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
import type { StudentUpdatePayload } from "../types/students.types";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";

const schema = z.object({
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
};

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

export function StudentEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { student, isLoading, isError, refetch } = useStudent(id || undefined);
  const updateStudent = useUpdateStudent(id);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

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
            <div className="flex justify-end">
              <Button icon={Save} isLoading={updateStudent.isPending} loadingText="กำลังบันทึก" type="submit">บันทึกข้อมูล</Button>
            </div>
          </div>
        </Form>
      )}
    </PageShell>
  );
}
