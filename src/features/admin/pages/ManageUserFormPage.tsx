import { useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type To,
} from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  Alert,
  AlertDescription,
  EMPTY_PHOTO_PICKER_VALUE,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  PasswordInput,
  PersonIcon,
  PhotoPicker,
  registerField,
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
import { useSafeBackTarget } from "../../../components/layout/navigation-context";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { getApiErrorMessage } from "../../../lib/api-error";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import {
  getScopeValidationError,
  type ScopeRestrictions,
} from "../../auth/lib/scope-validation";
import type { DataScope } from "../../auth/lib/permissions";
import { getManageUsersPath, getUserRealm } from "../lib/admin-presentation";
import { RoleGroupSelector } from "../components/RoleGroupSelector";
import { useRolesCatalog, useSaveUser, useUser } from "../hooks/useUsers";
import {
  EMPTY_USER_FORM,
  createUserFormSchema,
  type UserFormValues,
} from "../schemas/user.schema";
import type {
  ManagedUser,
  RoleDefinition,
  UserSavePayload,
} from "../types/admin.types";

const MANAGE_USERS_PATH = "/manage-users";

const ADDRESS_NAMES: AddressFieldNames<UserFormValues> = {
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

function toDefaults(user: ManagedUser | null): UserFormValues {
  if (!user) return EMPTY_USER_FORM;
  return {
    username: user.username,
    password: "",
    FirstName: user.FirstName ?? "",
    LastName: user.LastName ?? "",
    PersonID_Onec: user.PersonID_Onec ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    line_id: user.line_id ?? "",
    address_line: user.address_line ?? "",
    address_village_no: stripAddressPrefix("หมู่", user.address_village_no),
    address_street: stripAddressPrefix("ถนน", user.address_street),
    address_soi: stripAddressPrefix("ซอย", user.address_soi),
    address_trok: stripAddressPrefix("ตรอก", user.address_trok),
    address_sub_district: user.address_sub_district ?? "",
    address_district: user.address_district ?? "",
    address_province: user.address_province ?? "",
    address_postal_code: user.address_postal_code ?? "",
    address_latitude: user.address_latitude ?? null,
    address_longitude: user.address_longitude ?? null,
    role: user.role || user.roles?.[0] || "",
  };
}

function UserForm({
  isCouncilRoute,
  lockedSchoolId,
  user,
  rolesCatalog,
  returnPath,
}: {
  /**
   * Carried from the school-scoped จัดการผู้ใช้งาน list's "เพิ่มผู้ใช้งาน"
   * button (`?schoolId=`), same as TeacherFormPage's own `schoolId` — the
   * school this account was created from, so the scope starts at that school
   * and cannot drift from the selected school context.
   */
  lockedSchoolId?: number | null;
  /** True on /council/manage-users/*, where school scope is not selectable. */
  isCouncilRoute?: boolean;
  user: ManagedUser | null;
  rolesCatalog: RoleDefinition[];
  returnPath: To;
}) {
  const navigate = useNavigate();
  const saveUser = useSaveUser();
  const isEdit = Boolean(user?.id);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [photo, setPhoto] = useState<PhotoPickerValue>(
    EMPTY_PHOTO_PICKER_VALUE,
  );
  // Empty on a new account until a role is picked: the role's standard set is
  // the starting point, and the editor shows what was added or removed from it.
  const [permissions, setPermissions] = useState<string[]>(
    user?.permissions ?? [],
  );
  // School users are limited to one school and cannot retain grade/room scope
  // under the owner decision. Legacy classroom scope is handled explicitly
  // at submit time so it is never removed without confirmation.
  const [dataScope, setDataScope] = useState<DataScope>(() => {
    const initial =
      user?.data_scope ??
      (lockedSchoolId ? { school_ids: [lockedSchoolId] } : {});
    return {
      ...initial,
      ...(isCouncilRoute
        ? {
            school_ids: undefined,
            grade_levels: undefined,
            room_ids: undefined,
          }
        : { grade_levels: undefined, room_ids: undefined }),
    };
  });
  const [showScopeErrors, setShowScopeErrors] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<UserFormValues | null>(null);
  const [legacyScopeConfirmed, setLegacyScopeConfirmed] = useState(false);
  const { labelOf } = usePermissionCatalog();
  const scopeRestrictions: ScopeRestrictions = isCouncilRoute
    ? { disallowSchoolScope: true, disallowClassroomScope: true }
    : { disallowClassroomScope: true, requireSchoolScope: true };
  const form = useForm<UserFormValues>({
    defaultValues: toDefaults(user),
    resolver: zodResolver(createUserFormSchema(user?.username)),
  });
  const locationQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
  });
  const geocodeAddress = useMutation({
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
    throwOnError: false,
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  const assignableRoleGroups = rolesCatalog.filter(
    (role) => role.is_assignable,
  );
  const selectedRoleGroup = rolesCatalog.find(
    (role) => role.name === selectedRole,
  );
  const scopeError = getScopeValidationError(
    selectedRoleGroup?.scope_mode ?? "global",
    dataScope,
    selectedRoleGroup?.label ?? selectedRole,
    selectedRoleGroup?.scope_policy,
    scopeRestrictions,
  );

  function handleRoleChange(role: string): void {
    form.setValue("role", role, { shouldValidate: form.formState.isSubmitted });
    // Switching roles restarts from that role's standard set — keeping the old
    // role's custom additions would grant permissions nobody chose.
    const nextBaseline =
      rolesCatalog.find((entry) => entry.name === role)?.default_permissions ??
      [];
    setPermissions(nextBaseline);
  }

  function goBack(): void {
    void navigate(returnPath);
  }

  const hasLegacyClassroomScope = Boolean(
    user?.data_scope?.grade_levels?.length ||
    user?.data_scope?.room_ids?.length,
  );

  function handleSubmit(values: UserFormValues): void {
    if (scopeError) {
      setShowScopeErrors(true);
      return;
    }
    if (isEdit && hasLegacyClassroomScope && !legacyScopeConfirmed) {
      setPendingSubmitValues(values);
      return;
    }
    persistUser(values);
  }

  function persistUser(values: UserFormValues): void {
    const role = values.role.trim();
    const password = values.password.trim();
    const payload: UserSavePayload = {
      id: user?.id ?? null,
      username: values.username.trim(),
      FirstName: values.FirstName.trim(),
      LastName: values.LastName.trim(),
      PersonID_Onec: values.PersonID_Onec.trim(),
      role,
      roles: [role],
      // Sent as chosen: the editor starts from the role's standard set, so an
      // untouched form still posts exactly that set.
      permissions,
      status: user?.status || "ACTIVE",
      data_scope: dataScope,
      phone: values.phone.trim(),
      email: values.email.trim(),
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
      ...(password ? { password } : {}),
    };

    saveUser.mutate(
      {
        id: user?.id ?? null,
        payload,
        photo: photo.file,
        removePhoto: photo.removed,
      },
      {
        onSuccess: (response) => {
          if (
            !isEdit &&
            response &&
            typeof response === "object" &&
            "tempPassword" in response &&
            response.tempPassword
          ) {
            setGeneratedPassword(response.tempPassword);
            return;
          }
          goBack();
        },
        onError: (error) => {
          const message = getApiErrorMessage(
            error,
            "บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล",
          );
          // The server's own username/password rules land under the field
          // they are about, red, like every other field error.
          if (message.startsWith("ชื่อผู้ใช้งาน")) {
            form.setError("username", { type: "server", message });
          } else if (message.startsWith("รหัสผ่าน")) {
            form.setError("password", { type: "server", message });
          }
        },
      },
    );
  }

  return (
    <>
      <Form form={form} onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <PersonIcon className="size-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
          </div>

          <FormErrorAlert
            className="mb-4"
            error={saveUser.error}
            fallback="บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[187px_minmax(0,1fr)]">
            <div>
              <FormLabel aria-hidden="true" className="invisible">
                .
              </FormLabel>
              <PhotoPicker
                disabled={saveUser.isPending}
                label="รูปประจำตัวผู้ใช้งาน"
                onChange={setPhoto}
                storedUrl={resolveApiMediaUrl(user?.photo_url ?? null)}
                value={photo}
              />
            </div>

            {/* One grid per row, not one grid for the whole field list —
                exact technique as AddressFormSection.tsx: no space-y on this
                container, every row ends in a 28px FormMessage tail
                (space-y-2's 8px + min-h-5's 20px), and every row after the
                first cancels that with -mt-2 to net a 20px gap instead of
                stacking a second gap on top of it. */}
            <div className="self-start">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="FirstName" required>
                    ชื่อ
                  </FormLabel>
                  <Input
                    id="FirstName"
                    placeholder="ระบุชื่อผู้ใช้งาน"
                    {...registerField(form, "FirstName")}
                  />
                  <FormMessage<UserFormValues> name="FirstName" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="LastName" required>
                    นามสกุล
                  </FormLabel>
                  <Input
                    id="LastName"
                    placeholder="ระบุนามสกุลผู้ใช้งาน"
                    {...registerField(form, "LastName")}
                  />
                  <FormMessage<UserFormValues> name="LastName" />
                </FormItem>
              </div>

              <div className="-mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="email" required>
                    อีเมล
                  </FormLabel>
                  <Input
                    id="email"
                    placeholder="example@gmail.com"
                    type="email"
                    {...registerField(form, "email")}
                  />
                  <FormMessage<UserFormValues> name="email" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="phone" required>
                    เบอร์โทรศัพท์
                  </FormLabel>
                  <NumericInput
                    id="phone"
                    maxLength={10}
                    placeholder="XXXXXXXXXX"
                    {...registerField(form, "phone")}
                  />
                  <FormMessage<UserFormValues> name="phone" />
                </FormItem>
              </div>

              <div className="-mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="line_id">LINE ID</FormLabel>
                  <Input
                    id="line_id"
                    maxLength={64}
                    placeholder="ระบุ LINE ID"
                    {...registerField(form, "line_id")}
                  />
                  <FormMessage<UserFormValues> name="line_id" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="PersonID_Onec" required>
                    เลขบัตรประชาชน
                  </FormLabel>
                  <NumericInput
                    id="PersonID_Onec"
                    maxLength={13}
                    placeholder="XXXXXXXXXXXXX"
                    {...registerField(form, "PersonID_Onec")}
                  />
                  <FormMessage<UserFormValues> name="PersonID_Onec" />
                </FormItem>
              </div>

              <div className="-mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="password" required={!isEdit}>
                    {isEdit ? "รหัสผ่าน (เว้นว่างเพื่อคงเดิม)" : "รหัสผ่าน"}
                  </FormLabel>
                  {/* Setting someone else's password, not signing in: without
                      this the browser pours the operator's own saved login
                      into these two fields. */}
                  <PasswordInput
                    autoComplete="new-password"
                    id="password"
                    placeholder="XXXXXXXXXX"
                    {...registerField(form, "password")}
                  />
                  <FormMessage<UserFormValues> name="password" />
                </FormItem>
              </div>

              <div className="-mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="username" required>
                    ชื่อผู้ใช้งาน
                  </FormLabel>
                  <Input
                    autoComplete="off"
                    id="username"
                    placeholder="ใช้สำหรับเข้าสู่ระบบ"
                    {...registerField(form, "username")}
                  />
                  <FormMessage<UserFormValues> name="username" />
                </FormItem>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <AddressFormSection
            catalog={locationQuery.data}
            disabled={saveUser.isPending}
            form={form}
            geocodeError={
              geocodeAddress.isError ? (
                <FormErrorAlert
                  error={geocodeAddress.error}
                  fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                />
              ) : null
            }
            isGeocoding={geocodeAddress.isPending}
            names={ADDRESS_NAMES}
            onGeocode={async (address) =>
              Boolean(await geocodeAddress.mutateAsync(address))
            }
            showPlaceholders={!isEdit}
            title="ที่อยู่ติดต่อ"
          />
        </div>

        <Card className="mt-6 p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="size-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">
              กำหนดสิทธิ์การเข้าถึง
            </h2>
          </div>
          <RoleGroupSelector
            disabled={saveUser.isPending}
            labelOf={labelOf}
            onChange={handleRoleChange}
            onPermissionsChange={setPermissions}
            permissions={permissions}
            roleGroups={assignableRoleGroups}
            value={selectedRole}
          />
          <FormMessage<UserFormValues> name="role" />

          {/* Pages are ticked inside the group above; this only sets which rows
              the account may see. Shown before a role is picked too (owner,
              2026-09-22: "ให้ scope มันขึ้นมาเลยไม่ต้องรอเลือก role ก่อน") —
              the editor itself already has a "เลือกตำแหน่งก่อน" placeholder
              for that state, it just needs an empty role rather than being
              gated out here. */}
          <div className="mt-6">
            {pendingSubmitValues ? (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>
                  บัญชีนี้มีขอบเขตระดับชั้นหรือห้องจากข้อมูลเดิม
                  ซึ่งจะถูกนำออกตามกติกาผู้ใช้โรงเรียน
                  กรุณายืนยันก่อนบันทึกการเปลี่ยนแปลง
                  <span className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        const values = pendingSubmitValues;
                        setPendingSubmitValues(null);
                        setLegacyScopeConfirmed(true);
                        persistUser(values);
                      }}
                      size="sm"
                      type="button"
                    >
                      ยืนยันการปรับขอบเขต
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingSubmitValues(null);
                        setLegacyScopeConfirmed(false);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      ยกเลิก
                    </Button>
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}
            <PermissionScopeEditor
              dataScope={dataScope}
              disabled={saveUser.isPending}
              onDataScopeChange={setDataScope}
              role={selectedRoleGroup?.name ?? ""}
              roleLabel={selectedRoleGroup?.label ?? ""}
              scopeMode={selectedRoleGroup?.scope_mode ?? "global"}
              scopePolicy={selectedRoleGroup?.scope_policy}
              showErrors={showScopeErrors}
              restrictions={scopeRestrictions}
            />
          </div>
        </Card>

        <FormActions>
          <Button onClick={goBack} size="lg" type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button
            isLoading={saveUser.isPending}
            loadingText="กำลังบันทึก"
            size="lg"
            type="submit"
          >
            บันทึก
          </Button>
        </FormActions>
      </Form>

      <CredentialDialog
        onClose={() => {
          setGeneratedPassword("");
          goBack();
        }}
        open={Boolean(generatedPassword)}
        value={generatedPassword}
      />
    </>
  );
}

export function ManageUserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const safeBackTarget = useSafeBackTarget();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : null;
  const returnPath =
    searchParams.get("returnTo") === "/profile" ? "/profile" : safeBackTarget;
  const lockedSchoolId = Number(searchParams.get("schoolId")) || null;
  const isCouncilRoute = location.pathname.startsWith("/council/");
  const {
    data: user = null,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useUser(Number.isInteger(userId) ? userId : null);
  const realmListPath = user
    ? getManageUsersPath(getUserRealm(user))
    : isCouncilRoute
      ? "/council/manage-users"
      : MANAGE_USERS_PATH;
  const {
    rolesCatalog,
    isLoading: isRolesLoading,
    isError: isRolesError,
    refetch: refetchRoles,
  } = useRolesCatalog();
  const realmMismatch = Boolean(
    isEdit &&
    user &&
    getUserRealm(user) !== (isCouncilRoute ? "council" : "school"),
  );

  return (
    <PageShell>
      <PageToolbar
        description="กรอกข้อมูลผู้ใช้งานและกำหนดสิทธิ์การเข้าถึง"
        navigation={
          <NavButton icon={ArrowLeft} to={returnPath} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title={isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
      />

      {isRolesLoading || (isEdit && isUserLoading && !user) ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isRolesError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดกลุ่มสิทธิ์การเข้าถึง"
          onRetry={refetchRoles}
          title="ไม่สามารถโหลดข้อมูลบทบาทได้"
        />
      ) : isEdit && (isUserError || !user) ? (
        <ErrorState
          description="ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข"
          onRetry={() => void navigate(realmListPath)}
          retryLabel="กลับไปรายการผู้ใช้งาน"
          title="ไม่พบผู้ใช้งาน"
        />
      ) : realmMismatch ? (
        <ErrorState
          description="ผู้ใช้งานนี้ไม่อยู่ในขอบเขตของเส้นทางที่เลือก จึงไม่สามารถแก้ไขจากหน้านี้ได้"
          onRetry={() => void navigate(realmListPath)}
          retryLabel="กลับไปรายการผู้ใช้งาน"
          title="ขอบเขตบัญชีไม่ตรงกับเส้นทางนี้"
        />
      ) : (
        <UserForm
          // Add and edit share this page; a fresh form per account keeps an
          // edited account's values from carrying over into a new one.
          isCouncilRoute={isCouncilRoute}
          key={user ? `edit-${user.id}` : "new"}
          lockedSchoolId={isEdit ? null : lockedSchoolId}
          returnPath={returnPath}
          rolesCatalog={rolesCatalog}
          user={user}
        />
      )}
    </PageShell>
  );
}
