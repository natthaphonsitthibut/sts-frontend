import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Search, UserRound } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { authService } from "../api/auth.service";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AuthUser, UpdateProfilePayload } from "../types/auth.types";

const PROFILE_QUERY_KEY = ["auth", "profile", "me"] as const;

const profileSchema = z.object({
  FirstName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(150, "ชื่อยาวเกินไป"),
  LastName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(150, "นามสกุลยาวเกินไป"),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9]{9,10}$/.test(value), {
      message: "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก",
    }),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    }),
  affiliation: z.string().trim().max(255, "หน่วยงานยาวเกินไป"),
  line_id: z.string().trim().max(64, "LINE ID ยาวเกินไป"),
  address_line: z.string().trim().max(255, "ที่อยู่ยาวเกินไป"),
  address_sub_district: z.string().trim().max(100, "ตำบล/แขวงยาวเกินไป"),
  address_district: z.string().trim().max(100, "อำเภอ/เขตยาวเกินไป"),
  address_province: z.string().trim().max(100, "จังหวัดยาวเกินไป"),
  address_postal_code: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9]{5}$/.test(value), {
      message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
    }),
  address_latitude: z.number().min(-90).max(90).nullable(),
  address_longitude: z.number().min(-180).max(180).nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function toFormValues(user: AuthUser | null | undefined): ProfileFormValues {
  return {
    FirstName: user?.FirstName ?? "",
    LastName: user?.LastName ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    affiliation: user?.affiliation ?? "",
    line_id: user?.line_id ?? "",
    address_line: user?.address_line ?? "",
    address_sub_district: user?.address_sub_district ?? "",
    address_district: user?.address_district ?? "",
    address_province: user?.address_province ?? "",
    address_postal_code: user?.address_postal_code ?? "",
    address_latitude: user?.address_latitude ?? null,
    address_longitude: user?.address_longitude ?? null,
  };
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const storageTarget = useAuthSessionStore((state) => state.storageTarget);
  const hasAdminAccess = useAuthSessionStore((state) => state.hasAdminAccess);
  const saveSession = useAuthSessionStore((state) => state.saveSession);

  // Magic/virtual sessions have no persistent account to edit — they use the
  // task guest flow instead, so keep them out of the self-edit page entirely.
  const isVirtual = Boolean(user?.virtual_login);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: authService.getMyProfile,
    enabled: !isVirtual,
  });

  const locationQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
    enabled: !isVirtual,
  });

  const form = useForm<ProfileFormValues>({
    defaultValues: toFormValues(user),
    // Keep the form in sync once the freshest profile arrives from the server.
    values: profileQuery.data ? toFormValues(profileQuery.data) : undefined,
    resolver: zodResolver(profileSchema),
  });

  const addressProvince = useWatch({ control: form.control, name: "address_province" });
  const addressDistrict = useWatch({ control: form.control, name: "address_district" });
  const addressSubDistrict = useWatch({
    control: form.control,
    name: "address_sub_district",
  });
  const addressLine = useWatch({ control: form.control, name: "address_line" });
  const addressPostalCode = useWatch({
    control: form.control,
    name: "address_postal_code",
  });
  const addressLatitude = useWatch({
    control: form.control,
    name: "address_latitude",
  });
  const addressLongitude = useWatch({
    control: form.control,
    name: "address_longitude",
  });
  const locationCatalog = locationQuery.data;
  const addressProvinces = useMemo(
    () => unique([addressProvince, ...(locationCatalog?.provinces ?? [])]),
    [addressProvince, locationCatalog],
  );
  const addressDistricts = useMemo(
    () =>
      unique([
        addressDistrict,
        ...(locationCatalog?.districts ?? [])
          .filter((row) => !addressProvince || row.province === addressProvince)
          .map((row) => row.district),
      ]),
    [addressDistrict, addressProvince, locationCatalog],
  );
  const addressSubDistricts = useMemo(
    () =>
      unique([
        addressSubDistrict,
        ...(locationCatalog?.subDistricts ?? [])
          .filter((row) => !addressProvince || row.province === addressProvince)
          .filter((row) => !addressDistrict || row.district === addressDistrict)
          .map((row) => row.sub_district),
      ]),
    [addressDistrict, addressProvince, addressSubDistrict, locationCatalog],
  );

  const updateProfile = useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      authService.updateMyProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedUser);
      saveSession(updatedUser, {
        target: storageTarget ?? "local",
        hasAdminAccess,
      });
      form.reset(toFormValues(updatedUser));
    },
    throwOnError: false,
  });
  const geocodeProfileAddress = useMutation({
    mutationFn: geoService.geocodeProfileAddress,
    onSuccess: (result) => {
      if (!result) {
        form.setError("address_line", {
          type: "manual",
          message: "ไม่พบพิกัดจากที่อยู่นี้ กรุณาตรวจสอบข้อมูลหรือปักหมุดบนแผนที่",
        });
        return;
      }
      form.clearErrors("address_line");
      form.setValue("address_latitude", result.lat, { shouldDirty: true });
      form.setValue("address_longitude", result.lng, { shouldDirty: true });
      if (result.postalCode) {
        form.setValue("address_postal_code", result.postalCode, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    throwOnError: false,
  });

  if (isVirtual) {
    return <Navigate replace to="/" />;
  }

  function handleSubmit(values: ProfileFormValues): void {
    updateProfile.mutate({
      FirstName: values.FirstName.trim(),
      LastName: values.LastName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      affiliation: values.affiliation.trim(),
      line_id: values.line_id.trim(),
      address_line: values.address_line.trim(),
      address_sub_district: values.address_sub_district.trim(),
      address_district: values.address_district.trim(),
      address_province: values.address_province.trim(),
      address_postal_code: values.address_postal_code.trim(),
      address_latitude: values.address_latitude,
      address_longitude: values.address_longitude,
    });
  }

  const showSuccess = updateProfile.isSuccess && !form.formState.isDirty;
  const fullAddress = joinAddressParts([
    addressLine,
    addressSubDistrict,
    addressDistrict,
    addressProvince,
    addressPostalCode,
  ]);

  return (
    <PageShell>
      <PageToolbar
        description="ตรวจสอบและแก้ไขข้อมูลส่วนตัวสำหรับการติดต่อและใช้งานระบบ"
        icon={UserRound}
        title="โปรไฟล์ของฉัน"
      />

      {profileQuery.isLoading || locationQuery.isLoading ? (
        <SkeletonStack lines={8} />
      ) : profileQuery.isError || locationQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลโปรไฟล์หรือรายการที่อยู่ได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            void profileQuery.refetch();
            void locationQuery.refetch();
          }}
        />
      ) : (
        <Form form={form} onSubmit={handleSubmit}>
          <div className="space-y-5">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound className="size-5 text-primary" aria-hidden="true" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {updateProfile.isError ? (
                  <FormErrorAlert
                    error={updateProfile.error}
                    fallback="บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                  />
                ) : showSuccess ? (
                  <Alert variant="success">
                    <AlertDescription className="flex items-center gap-2">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      บันทึกโปรไฟล์เรียบร้อยแล้ว
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="FirstName" required>
                      ชื่อ
                    </FormLabel>
                    <Input
                      autoComplete="given-name"
                      id="FirstName"
                      placeholder="เช่น สมชาย"
                      {...registerField(form, "FirstName")}
                    />
                    <FormMessage<ProfileFormValues> name="FirstName" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="LastName" required>
                      นามสกุล
                    </FormLabel>
                    <Input
                      autoComplete="family-name"
                      id="LastName"
                      placeholder="เช่น ใจดี"
                      {...registerField(form, "LastName")}
                    />
                    <FormMessage<ProfileFormValues> name="LastName" />
                  </FormItem>
                </div>

                <FormItem>
                  <FormLabel htmlFor="phone">เบอร์โทรศัพท์</FormLabel>
                  <Input
                    autoComplete="tel"
                    id="phone"
                    inputMode="tel"
                    placeholder="เช่น 0812345678"
                    {...registerField(form, "phone")}
                  />
                  <FormMessage<ProfileFormValues> name="phone" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="email">อีเมล</FormLabel>
                  <Input
                    autoComplete="email"
                    id="email"
                    type="email"
                    placeholder="เช่น somchai.jaidee@school.ac.th"
                    {...registerField(form, "email")}
                  />
                  <FormMessage<ProfileFormValues> name="email" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="affiliation">หน่วยงาน/สังกัด</FormLabel>
                  <Input
                    autoComplete="organization"
                    id="affiliation"
                    placeholder="เช่น โรงเรียนสาธิตเทศบาลนคร"
                    {...registerField(form, "affiliation")}
                  />
                  <FormMessage<ProfileFormValues> name="affiliation" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="line_id">LINE ID</FormLabel>
                  <Input
                    autoComplete="off"
                    id="line_id"
                    placeholder="เช่น somchai.teacher"
                    {...registerField(form, "line_id")}
                  />
                  <FormMessage<ProfileFormValues> name="line_id" />
                </FormItem>

              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="size-5 text-primary" aria-hidden="true" />
                  ที่อยู่ติดต่อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormItem>
                  <FormLabel htmlFor="address_line">รายละเอียดที่อยู่</FormLabel>
                  <Input
                    autoComplete="street-address"
                    id="address_line"
                    placeholder="เช่น 99/9 หมู่ 5 ซอยสุขใจ ถนนประชาราษฎร์"
                    {...registerField(form, "address_line")}
                  />
                  <FormMessage<ProfileFormValues> name="address_line" />
                </FormItem>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormItem>
                    <FormLabel>จังหวัด</FormLabel>
                    <Combobox
                      disabled={updateProfile.isPending}
                      onChange={(next) => {
                        form.setValue("address_province", next, { shouldDirty: true });
                        form.setValue("address_district", "", { shouldDirty: true });
                        form.setValue("address_sub_district", "", { shouldDirty: true });
                        form.setValue("address_postal_code", "", { shouldDirty: true });
                      }}
                      options={[
                        { value: "", label: "เลือกจังหวัด" },
                        ...addressProvinces.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาจังหวัด"
                      value={addressProvince}
                    />
                    <FormMessage<ProfileFormValues> name="address_province" />
                  </FormItem>

                  <FormItem>
                    <FormLabel>อำเภอ/เขต</FormLabel>
                    <Combobox
                      disabled={updateProfile.isPending || !addressProvince}
                      onChange={(next) => {
                        form.setValue("address_district", next, { shouldDirty: true });
                        form.setValue("address_sub_district", "", { shouldDirty: true });
                        form.setValue("address_postal_code", "", { shouldDirty: true });
                      }}
                      options={[
                        { value: "", label: "เลือกอำเภอ/เขต" },
                        ...addressDistricts.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาอำเภอ/เขต"
                      value={addressDistrict}
                    />
                    <FormMessage<ProfileFormValues> name="address_district" />
                  </FormItem>

                  <FormItem>
                    <FormLabel>ตำบล/แขวง</FormLabel>
                    <Combobox
                      disabled={updateProfile.isPending || !addressDistrict}
                      onChange={(next) => {
                        form.setValue("address_sub_district", next, { shouldDirty: true });
                        form.setValue("address_postal_code", "", { shouldDirty: true });
                      }}
                      options={[
                        { value: "", label: "เลือกตำบล/แขวง" },
                        ...addressSubDistricts.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาตำบล/แขวง"
                      value={addressSubDistrict}
                    />
                    <FormMessage<ProfileFormValues> name="address_sub_district" />
                  </FormItem>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="address_postal_code">รหัสไปรษณีย์</FormLabel>
                    <Input
                      autoComplete="postal-code"
                      id="address_postal_code"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="เช่น 10110"
                      {...registerField(form, "address_postal_code")}
                    />
                    <FormMessage<ProfileFormValues> name="address_postal_code" />
                  </FormItem>
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-700">พิกัดที่อยู่ติดต่อ</div>
                      <div className="text-xs text-slate-500">
                        ใช้พิกัดที่บันทึกไว้ก่อน และค้นหาจากที่อยู่เมื่อยังไม่มีพิกัด
                      </div>
                    </div>
                    <Button
                      disabled={
                        !fullAddress ||
                        geocodeProfileAddress.isPending ||
                        updateProfile.isPending
                      }
                      icon={Search}
                      isLoading={geocodeProfileAddress.isPending}
                      loadingText="กำลังค้นหา"
                      onClick={() => geocodeProfileAddress.mutate(fullAddress)}
                      type="button"
                      variant="outline"
                    >
                      {addressLatitude !== null && addressLongitude !== null
                        ? "ค้นหาพิกัดใหม่จากที่อยู่"
                        : "ค้นหาพิกัดจากที่อยู่"}
                    </Button>
                  </div>

                  {geocodeProfileAddress.isError ? (
                    <FormErrorAlert
                      error={geocodeProfileAddress.error}
                      fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                    />
                  ) : null}

                  <LocationMapPicker
                    address={fullAddress}
                    editable
                    emptyDescription="ค้นหาจากที่อยู่ หรือคลิกบนแผนที่เพื่อปักหมุด"
                    emptyTitle="ยังไม่มีพิกัด"
                    lat={addressLatitude}
                    lng={addressLongitude}
                    markerLabel="พิกัดที่อยู่"
                    onCoordinateChange={(coordinates) => {
                      form.setValue("address_latitude", coordinates.lat, {
                        shouldDirty: true,
                      });
                      form.setValue("address_longitude", coordinates.lng, {
                        shouldDirty: true,
                      });
                    }}
                    title="ตำแหน่งที่อยู่บนแผนที่"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    disabled={updateProfile.isPending}
                    onClick={() => form.reset(toFormValues(profileQuery.data ?? user))}
                    type="button"
                    variant="secondary"
                  >
                    ยกเลิกการแก้ไข
                  </Button>
                  <Button
                    disabled={!form.formState.isDirty || geocodeProfileAddress.isPending}
                    isLoading={updateProfile.isPending}
                    loadingText="กำลังบันทึก"
                    type="submit"
                  >
                    บันทึกโปรไฟล์
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Form>
      )}
    </PageShell>
  );
}
