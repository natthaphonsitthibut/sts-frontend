import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
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
  Tabs,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { getUserAvatarGradient } from "../../admin/lib/admin-presentation";
import { authService } from "../api/auth.service";
import { PermissionBadgeList } from "../components/PermissionBadgeList";
import { describeDataScopeForDisplay } from "../lib/permissions";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AuthUser, UpdateProfilePayload } from "../types/auth.types";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { usePermissions } from "../hooks/usePermissions";
import { NavButton } from "../../../components/layout/nav-button";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";

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
  address_village_no: z.string().trim().max(100, "หมู่/บ้านเลขที่ยาวเกินไป"),
  address_street: z.string().trim().max(150, "ชื่อถนนยาวเกินไป"),
  address_soi: z.string().trim().max(150, "ชื่อซอยยาวเกินไป"),
  address_trok: z.string().trim().max(150, "ชื่อตรอกยาวเกินไป"),
  address_sub_district: z.string().trim().max(100, "ตำบล/แขวงยาวเกินไป"),
  address_district: z.string().trim().max(100, "อำเภอ/เขตยาวเกินไป"),
  address_province: z.string().trim().max(100, "จังหวัดยาวเกินไป"),
  address_postal_code: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9]{5}$/.test(value), {
      message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
    }),
  address_latitude: nullableLatitude,
  address_longitude: nullableLongitude,
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// The free-form `address_line` column now backs the บ้านเลขที่ field; หมู่ keeps
// its own `address_village_no` column.
const ADDRESS_NAMES: AddressFieldNames<ProfileFormValues> = {
  houseNo: "address_line",
  moo: "address_village_no",
  street: "address_street",
  soi: "address_soi",
  trok: "address_trok",
  province: "address_province",
  district: "address_district",
  subDistrict: "address_sub_district",
  postalCode: "address_postal_code",
  latitude: "address_latitude",
  longitude: "address_longitude",
};

function toFormValues(user: AuthUser | null | undefined): ProfileFormValues {
  return {
    FirstName: user?.FirstName ?? "",
    LastName: user?.LastName ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    affiliation: user?.affiliation ?? "",
    line_id: user?.line_id ?? "",
    address_line: user?.address_line ?? "",
    address_village_no: stripAddressPrefix("หมู่", user?.address_village_no),
    address_street: stripAddressPrefix("ถนน", user?.address_street),
    address_soi: stripAddressPrefix("ซอย", user?.address_soi),
    address_trok: stripAddressPrefix("ตรอก", user?.address_trok),
    address_sub_district: user?.address_sub_district ?? "",
    address_district: user?.address_district ?? "",
    address_province: user?.address_province ?? "",
    address_postal_code: user?.address_postal_code ?? "",
    address_latitude: user?.address_latitude ?? null,
    address_longitude: user?.address_longitude ?? null,
  };
}

function profileText(value: string | number | boolean | null | undefined): string {
  if (value === true) return "ใช่";
  if (value === false) return "ไม่ใช่";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function ProfileIdentityCard({ user }: { user: AuthUser }) {
  const displayName = [user.FirstName, user.LastName].filter(Boolean).join(" ").trim() || user.username;
  const roleText = user.labels?.join(", ") || user.roles.join(", ") || "-";
  return (
    <Card className="mb-5">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className="flex size-24 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold shadow-card"
          style={getUserAvatarGradient(displayName)}
        >
          {displayName.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-slate-900">{displayName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>@{user.username}</span>
            <span aria-hidden="true">•</span>
            <span>{roleText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function describeProfileScope(user: AuthUser | null | undefined): string {
  return describeDataScopeForDisplay(user?.data_scope, user?.data_scope_labels?.schools);
}

function ProfileDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

export function ProfilePage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useRouteTab(
    {
      info: "/profile",
      permissions: "/profile/permissions",
    } as const,
    "info",
  );
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
        return;
      }
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
      address_village_no: stripAddressPrefix("หมู่", values.address_village_no),
      address_street: stripAddressPrefix("ถนน", values.address_street),
      address_soi: stripAddressPrefix("ซอย", values.address_soi),
      address_trok: stripAddressPrefix("ตรอก", values.address_trok),
      address_sub_district: values.address_sub_district.trim(),
      address_district: values.address_district.trim(),
      address_province: values.address_province.trim(),
      address_postal_code: values.address_postal_code.trim(),
      address_latitude: values.address_latitude,
      address_longitude: values.address_longitude,
    });
  }

  const showSuccess = updateProfile.isSuccess && !form.formState.isDirty;
  const profileUser = profileQuery.data ?? user;

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Tabs
            aria-label="โหมดโปรไฟล์ของฉัน"
            onChange={setActiveTab}
            options={[
              { value: "info", label: "ข้อมูล" },
              { value: "permissions", label: "สิทธิ์" },
            ]}
            value={activeTab}
          />
        }
        description="ตรวจสอบและแก้ไขข้อมูลส่วนตัวสำหรับการติดต่อและใช้งานระบบ"
        icon={UserRound}
        title="โปรไฟล์ของฉัน"
      />

      {profileUser ? <ProfileIdentityCard user={profileUser} /> : null}

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
      ) : activeTab === "info" ? (
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
                      {...registerField(form, "LastName")}
                    />
                    <FormMessage<ProfileFormValues> name="LastName" />
                  </FormItem>
                </div>

                <FormItem>
                  <FormLabel htmlFor="PersonID_Onec">เลขบัตรประชาชน</FormLabel>
                  <Input
                    autoComplete="off"
                    id="PersonID_Onec"
                    placeholder="ยังไม่ระบุ"
                    readOnly
                    value={profileUser?.PersonID_Onec ?? ""}
                  />
                  <p className="text-xs text-slate-500">
                    {can("manage-users-list") && profileUser?.id ? (
                      <>
                        แก้ไขได้ที่{" "}
                        <Link
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                          to={`/manage-users/${profileUser.id}/edit`}
                        >
                          หน้าจัดการผู้ใช้งาน
                        </Link>
                      </>
                    ) : (
                      "แก้ไขไม่ได้ด้วยตนเอง — ติดต่อผู้ดูแลระบบหากต้องแก้ไข"
                    )}
                  </p>
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="phone">เบอร์โทรศัพท์</FormLabel>
                  <Input
                    autoComplete="tel"
                    id="phone"
                    inputMode="tel"
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
                    {...registerField(form, "email")}
                  />
                  <FormMessage<ProfileFormValues> name="email" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="affiliation">หน่วยงาน/สังกัด</FormLabel>
                  <Input
                    autoComplete="organization"
                    id="affiliation"
                    {...registerField(form, "affiliation")}
                  />
                  <FormMessage<ProfileFormValues> name="affiliation" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="line_id">LINE ID</FormLabel>
                  <Input
                    autoComplete="off"
                    id="line_id"
                    {...registerField(form, "line_id")}
                  />
                  <FormMessage<ProfileFormValues> name="line_id" />
                </FormItem>

              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="size-5 text-primary" aria-hidden="true" />
                  ความปลอดภัยของบัญชี
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  เปลี่ยนรหัสผ่านเป็นประจำ และหลีกเลี่ยงการใช้รหัสผ่านซ้ำกับระบบอื่น
                </p>
                <NavButton className="shrink-0" icon={KeyRound} to="/change-password">
                  เปลี่ยนรหัสผ่าน
                </NavButton>
              </CardContent>
            </Card>

            <AddressFormSection
              catalog={locationQuery.data}
              disabled={updateProfile.isPending}
              form={form}
              geocodeError={geocodeProfileAddress.isError ? (
                <FormErrorAlert
                  error={geocodeProfileAddress.error}
                  fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                />
              ) : null}
              isGeocoding={geocodeProfileAddress.isPending}
              names={ADDRESS_NAMES}
              onGeocode={async (address) =>
                Boolean(await geocodeProfileAddress.mutateAsync(address))
              }
              title="ที่อยู่ติดต่อ"
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={updateProfile.isPending}
                onClick={() => form.reset(toFormValues(profileQuery.data ?? user))}
                type="button"
                variant="outline"
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
          </div>
        </Form>
      ) : (
        <div className="space-y-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                สิทธิ์และขอบเขตข้อมูล
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileDetailItem
                  label="ตำแหน่ง"
                  value={profileText(profileUser?.labels?.join(", ") || profileUser?.roles?.join(", "))}
                />
                <ProfileDetailItem
                  label="ขอบเขตข้อมูล"
                  value={describeProfileScope(profileUser)}
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-slate-500">สิทธิ์การใช้งาน</div>
                <div className="flex flex-wrap gap-2">
                  <PermissionBadgeList permissions={profileUser?.permissions ?? []} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
