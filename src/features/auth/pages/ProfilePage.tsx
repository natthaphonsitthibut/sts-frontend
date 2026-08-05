import { zodResolver } from "@hookform/resolvers/zod";
import { maskNationalId } from "../../../lib/pii-presentation";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  MapPin,
  ShieldCheck,
  SquarePen,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AvatarPhotoEditor,
  Button,
  Card,
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
  FormActions,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { SensitiveValueToggleButton } from "../../../components/security/SensitiveValueToggleButton";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { RoleGroupSelector } from "../../admin/components/RoleGroupSelector";
import type { RoleDefinition } from "../../admin/types/admin.types";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { authService } from "../api/auth.service";
import { describeDataScopeForDisplay } from "../lib/permissions";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AuthUser, UpdateProfilePayload } from "../types/auth.types";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { usePermissions } from "../hooks/usePermissions";
import { nullableLatitude, nullableLongitude } from "../../../lib/validation";
import { useTimedSensitiveReveal } from "../../../hooks/useTimedSensitiveReveal";

const PROFILE_QUERY_KEY = ["auth", "profile", "me"] as const;

const profileSchema = z.object({
  FirstName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ")
    .max(150, "ชื่อยาวเกินไป"),
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
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      {
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      },
    ),
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

function describeProfileScope(user: AuthUser | null | undefined): string {
  return describeDataScopeForDisplay(
    user?.data_scope,
    user?.data_scope_labels?.schools,
    user?.data_scope_labels?.gradeLevels,
  );
}

/** Name shown on the avatar — falls back to the username like the cards do. */
function displayNameOf(user: AuthUser | null | undefined): string {
  return (
    [user?.FirstName, user?.LastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "ผู้ใช้งาน"
  );
}

function ProfileDetailItem({
  action,
  label,
  value,
}: {
  action?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
            {value || "-"}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function ProfileAddressDetailsCard({ user }: { user: AuthUser }) {
  const values = toFormValues(user);
  const fullAddress = [
    values.address_line,
    values.address_village_no ? `หมู่ ${values.address_village_no}` : "",
    values.address_trok ? `ตรอก ${values.address_trok}` : "",
    values.address_soi ? `ซอย ${values.address_soi}` : "",
    values.address_street ? `ถนน ${values.address_street}` : "",
    values.address_sub_district,
    values.address_district,
    values.address_province,
    values.address_postal_code,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-800">
        <MapPin className="size-5 text-slate-700" aria-hidden="true" />
        ที่อยู่ติดต่อ
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileDetailItem label="บ้านเลขที่" value={values.address_line} />
        <ProfileDetailItem label="หมู่" value={values.address_village_no} />
        <ProfileDetailItem label="ถนน" value={values.address_street} />
        <ProfileDetailItem label="ซอย" value={values.address_soi} />
        <ProfileDetailItem label="ตรอก" value={values.address_trok} />
        <ProfileDetailItem
          label="ตำบล/แขวง"
          value={values.address_sub_district}
        />
        <ProfileDetailItem label="อำเภอ/เขต" value={values.address_district} />
        <ProfileDetailItem label="จังหวัด" value={values.address_province} />
        <ProfileDetailItem
          label="รหัสไปรษณีย์"
          value={values.address_postal_code}
        />
      </div>
      <div className="mt-5 border-t border-slate-200 pt-5">
        <LocationMapPicker
          address={fullAddress || undefined}
          emptyDescription="ระบบจะแสดงหมุดเมื่อมีการบันทึกพิกัดที่อยู่"
          lat={values.address_latitude}
          lng={values.address_longitude}
          markerLabel="พิกัดที่บันทึกไว้"
          title="ตำแหน่งที่อยู่บนแผนที่"
        />
      </div>
    </Card>
  );
}

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const { can } = usePermissions();
  const { labelOf } = usePermissionCatalog();
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const {
    hide: hideSensitiveValue,
    reveal: revealSensitiveValue,
    showCached: showCachedSensitiveValue,
    values: revealedSensitiveValues,
    visibleFields: visibleSensitiveFields,
  } = useTimedSensitiveReveal<"nationalId">(
    `profile:${user?.id ?? user?.username ?? "anonymous"}`,
  );
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
      setIsEditing(false);
    },
    throwOnError: false,
  });

  const updatePhoto = useMutation({
    mutationFn: (input: { photo?: File; remove?: boolean }) =>
      authService.updateMyPhoto(input),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedUser);
      saveSession(updatedUser, {
        target: storageTarget ?? "local",
        hasAdminAccess,
      });
    },
    throwOnError: false,
  });
  const geocodeProfileAddress = useMutation({
    meta: { suppressSuccessToast: true },
    mutationFn: geoService.geocodeProfileAddress,
    onSuccess: (result) => {
      if (!result) return;
      form.setValue("address_latitude", result.lat, { shouldDirty: true });
      form.setValue("address_longitude", result.lng, { shouldDirty: true });
      if (result.postalCode) {
        form.setValue("address_postal_code", result.postalCode, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
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
  const ownRoleName = profileUser?.roles?.[0] ?? "";
  // The full roles catalog is a manage-users read, so the account's own role is
  // rendered as a single locked row instead — same component, same look.
  const ownRoleGroups: Array<
    Pick<RoleDefinition, "name" | "label" | "default_permissions">
  > = ownRoleName
    ? [
        {
          name: ownRoleName,
          label: profileUser?.labels?.[0] ?? ownRoleName,
          default_permissions: profileUser?.permissions ?? [],
        },
      ]
    : [];
  const isNationalIdVisible =
    visibleSensitiveFields.nationalId === true &&
    revealedSensitiveValues.nationalId !== undefined;

  function toggleNationalId(): void {
    if (isNationalIdVisible) {
      hideSensitiveValue("nationalId");
    } else if (revealedSensitiveValues.nationalId !== undefined) {
      showCachedSensitiveValue("nationalId");
    } else if (profileUser?.PersonID_Onec) {
      revealSensitiveValue({ nationalId: profileUser.PersonID_Onec });
    }
  }

  function resetForm(): void {
    form.reset(toFormValues(profileQuery.data ?? user));
    updateProfile.reset();
    setIsEditing(false);
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <>
            {isEditing ? (
              <Button icon={ArrowLeft} onClick={resetForm} variant="outline">
                ย้อนกลับ
              </Button>
            ) : (
              <>
                <Button icon={SquarePen} onClick={() => setIsEditing(true)}>
                  แก้ไขข้อมูลส่วนตัว
                </Button>
                <NavButton icon={ArrowLeft} to={-1} variant="outline">
                  ย้อนกลับ
                </NavButton>
              </>
            )}
          </>
        }
        description="ตรวจสอบข้อมูลส่วนตัวสำหรับการติดต่อและใช้งานระบบ"
        icon={UserRound}
        title="โปรไฟล์ของฉัน"
      />

      {profileQuery.isLoading ? (
        <SkeletonStack lines={8} />
      ) : profileQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void profileQuery.refetch()}
        />
      ) : !profileUser ? (
        <ErrorState description="ไม่มีข้อมูลโปรไฟล์ในบัญชีนี้" />
      ) : !isEditing ? (
        <div className="space-y-5">
          {showSuccess ? (
            <Alert variant="success">
              <AlertDescription className="flex items-center gap-2">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                บันทึกโปรไฟล์เรียบร้อยแล้ว
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
              <UserRound className="size-5 text-slate-700" aria-hidden="true" />
              ข้อมูลทั่วไป
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <AvatarPhotoEditor
                label="รูปประจำตัว"
                name={displayNameOf(profileUser)}
                onSelect={() => undefined}
                photoUrl={resolveApiMediaUrl(profileUser.photo_url ?? null)}
                shape="square"
              />
              <div className="grid h-fit gap-3 sm:grid-cols-2">
                <ProfileDetailItem
                  label="ชื่อ"
                  value={profileUser.FirstName ?? ""}
                />
                <ProfileDetailItem
                  label="นามสกุล"
                  value={profileUser.LastName ?? ""}
                />
                <ProfileDetailItem
                  label="อีเมล"
                  value={profileUser.email ?? ""}
                />
                <ProfileDetailItem
                  label="เบอร์โทรศัพท์"
                  value={profileUser.phone ?? ""}
                />
                <ProfileDetailItem
                  label="หน่วยงาน/สังกัด"
                  value={profileUser.affiliation ?? ""}
                />
                <ProfileDetailItem
                  label="ชื่อผู้ใช้งาน"
                  value={profileUser.username}
                />
                <ProfileDetailItem
                  label="LINE ID"
                  value={profileUser.line_id ?? ""}
                />
                <div className="sm:col-span-2">
                  <ProfileDetailItem
                    action={
                      <SensitiveValueToggleButton
                        isVisible={isNationalIdVisible}
                        label="เลขบัตร"
                        onClick={toggleNationalId}
                      />
                    }
                    label="เลขบัตรประชาชน"
                    value={
                      isNationalIdVisible
                        ? (profileUser.PersonID_Onec ?? "")
                        : maskNationalId(profileUser.PersonID_Onec)
                    }
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {can("manage-users-list") && profileUser.id ? (
                      <>
                        แก้ไขได้ที่{" "}
                        <Link
                          className="font-semibold text-primary underline-offset-4 hover:underline"
                          to={`/manage-users/${profileUser.id}/edit`}
                        >
                          หน้าแก้ไขผู้ใช้งาน
                        </Link>
                      </>
                    ) : (
                      "แก้ไขไม่ได้ด้วยตนเอง — ติดต่อผู้ดูแลระบบหากต้องแก้ไข"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <ProfileAddressDetailsCard user={profileUser} />

          <Card className="p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
              <ShieldCheck
                className="size-5 text-slate-700"
                aria-hidden="true"
              />
              กำหนดสิทธิ์การเข้าถึง
            </h2>
            <RoleGroupSelector
              disabled
              labelOf={labelOf}
              onChange={() => undefined}
              roleGroups={ownRoleGroups}
              value={ownRoleName}
            />
            <p className="mt-4 text-xs text-slate-500">
              ขอบเขตข้อมูล: {describeProfileScope(profileUser)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <KeyRound
                    className="size-5 text-slate-700"
                    aria-hidden="true"
                  />
                  ความปลอดภัยของบัญชี
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  เปลี่ยนรหัสผ่านผ่านขั้นตอนเฉพาะที่ยืนยันรหัสผ่านปัจจุบันก่อน
                </p>
              </div>
              <NavButton
                className="shrink-0"
                icon={KeyRound}
                to="/change-password"
              >
                เปลี่ยนรหัสผ่าน
              </NavButton>
            </div>
          </Card>
        </div>
      ) : (
        <Form form={form} onSubmit={handleSubmit}>
          <div className="space-y-5">
            {showSuccess ? (
              <Alert variant="success">
                <AlertDescription className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  บันทึกโปรไฟล์เรียบร้อยแล้ว
                </AlertDescription>
              </Alert>
            ) : null}

            {/* One layout for both modes — the same card, photo column and
                two-column field grid as เพิ่ม/แก้ไขผู้ใช้งาน. Viewing simply means
                the inputs are read-only; nothing moves when editing starts. */}
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-2">
                <UserRound
                  className="size-5 text-slate-700"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-800">
                  ข้อมูลทั่วไป
                </h2>
              </div>

              {updateProfile.isError ? (
                <FormErrorAlert
                  className="mb-4"
                  error={updateProfile.error}
                  fallback="บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                />
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
                <AvatarPhotoEditor
                  editable
                  isSubmitting={updatePhoto.isPending}
                  label="รูปประจำตัว"
                  name={displayNameOf(profileUser)}
                  onRemove={() => updatePhoto.mutate({ remove: true })}
                  onSelect={(photo) => updatePhoto.mutate({ photo })}
                  photoUrl={resolveApiMediaUrl(profileUser?.photo_url ?? null)}
                  shape="square"
                />

                <div className="grid h-fit grid-cols-1 gap-x-4 sm:grid-cols-2">
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
                    <FormLabel htmlFor="affiliation">หน่วยงาน/สังกัด</FormLabel>
                    <Input
                      autoComplete="organization"
                      id="affiliation"
                      {...registerField(form, "affiliation")}
                    />
                    <FormMessage<ProfileFormValues> name="affiliation" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="username">ชื่อผู้ใช้งาน</FormLabel>
                    <Input
                      autoComplete="off"
                      id="username"
                      readOnly
                      value={profileUser?.username ?? ""}
                    />
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

                  <FormItem className="sm:col-span-2">
                    <FormLabel htmlFor="PersonID_Onec">
                      เลขบัตรประชาชน
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        autoComplete="off"
                        className="min-w-0 flex-1"
                        id="PersonID_Onec"
                        placeholder="ยังไม่ระบุ"
                        readOnly
                        value={
                          isNationalIdVisible
                            ? (profileUser?.PersonID_Onec ?? "")
                            : maskNationalId(profileUser?.PersonID_Onec)
                        }
                      />
                      <SensitiveValueToggleButton
                        isVisible={isNationalIdVisible}
                        label="เลขบัตร"
                        onClick={toggleNationalId}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {can("manage-users-list") && profileUser?.id ? (
                        <>
                          แก้ไขได้ที่{" "}
                          <Link
                            className="font-semibold text-primary underline-offset-4 hover:underline"
                            to={`/manage-users/${profileUser.id}/edit`}
                          >
                            หน้าแก้ไขผู้ใช้งาน
                          </Link>
                        </>
                      ) : (
                        "แก้ไขไม่ได้ด้วยตนเอง — ติดต่อผู้ดูแลระบบหากต้องแก้ไข"
                      )}
                    </p>
                  </FormItem>
                </div>
              </div>
            </Card>

            <AddressFormSection
              catalog={locationQuery.data}
              disabled={updateProfile.isPending}
              form={form}
              geocodeError={
                geocodeProfileAddress.isError ? (
                  <FormErrorAlert
                    error={geocodeProfileAddress.error}
                    fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                  />
                ) : null
              }
              isGeocoding={geocodeProfileAddress.isPending}
              names={ADDRESS_NAMES}
              onGeocode={async (address) =>
                Boolean(await geocodeProfileAddress.mutateAsync(address))
              }
              title="ที่อยู่ติดต่อ"
            />

            {/* Same card and same RoleGroupSelector as เพิ่ม/แก้ไขผู้ใช้งาน, only
                locked — nobody grants themselves a role. */}
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-2">
                <ShieldCheck
                  className="size-5 text-slate-700"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-800">
                  กำหนดสิทธิ์การเข้าถึง
                </h2>
              </div>
              <RoleGroupSelector
                disabled
                labelOf={labelOf}
                onChange={() => undefined}
                roleGroups={ownRoleGroups}
                value={ownRoleName}
              />
              <p className="mt-4 text-xs text-slate-500">
                ขอบเขตข้อมูล: {describeProfileScope(profileUser)}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <KeyRound
                      className="size-5 text-slate-700"
                      aria-hidden="true"
                    />
                    ความปลอดภัยของบัญชี
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    เปลี่ยนรหัสผ่านผ่านขั้นตอนเฉพาะที่ยืนยันรหัสผ่านปัจจุบันก่อน
                  </p>
                </div>
                <NavButton
                  className="shrink-0"
                  icon={KeyRound}
                  to="/change-password"
                >
                  เปลี่ยนรหัสผ่าน
                </NavButton>
              </div>
            </Card>

            <FormActions className="mt-0">
              <Button
                onClick={resetForm}
                size="lg"
                type="button"
                variant="outline"
              >
                ยกเลิก
              </Button>
              <Button
                disabled={
                  !form.formState.isDirty || geocodeProfileAddress.isPending
                }
                isLoading={updateProfile.isPending}
                loadingText="กำลังบันทึก"
                size="lg"
                type="submit"
              >
                บันทึก
              </Button>
            </FormActions>
          </div>
        </Form>
      )}
    </PageShell>
  );
}
