import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, UserCog } from "lucide-react";
import {
  Button,
  Card,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  PasswordInput,
  registerField,
  Tabs,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import {
  AddressFormSection,
  type AddressFieldNames,
} from "../../../components/address/AddressFormSection";
import { stripAddressPrefix } from "../../../components/address/address-format";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { geoService } from "../../tasks/api/geo.service";
import { ROLE_LABELS, type DataScope } from "../../auth/lib/permissions";
import {
  getScopeFieldStates,
  getScopeValidationError,
} from "../../auth/lib/scope-validation";
import {
  PermissionScopeEditor,
  type ScopeSelectionLabels,
} from "../../auth/components/PermissionScopeEditor";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { UserSaveReviewDialog, type UserSaveReview } from "../components/UserSaveReviewDialog";
import { useRolesCatalog, useSaveUser, useUser } from "../hooks/useUsers";
import {
  EMPTY_USER_FORM,
  userFormSchema,
  type UserFormValues,
} from "../schemas/user.schema";
import { USER_STATUS_OPTIONS } from "../lib/admin-presentation";
import type {
  ManagedUser,
  RoleDefinition,
  RoleScopeMode,
  UserSavePayload,
} from "../types/admin.types";

const MANAGE_USERS_PATH = "/manage-users";

// The free-form `address_line` column backs the บ้านเลขที่ field; หมู่ keeps its
// own `address_village_no` column. Mirrors the profile page mapping.
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

const SCOPE_KEYS = [
  "provinces",
  "districts",
  "sub_districts",
  "school_ids",
  "grade_levels",
  "room_ids",
] as const;

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function clearForbiddenScopeFields(
  scope: DataScope,
  scopeMode: RoleScopeMode,
): DataScope {
  const states = getScopeFieldStates(scopeMode);
  let changed = false;
  const next: DataScope = { ...scope };
  for (const key of SCOPE_KEYS) {
    if (states[key] === "forbidden" && next[key] !== undefined) {
      next[key] = undefined;
      changed = true;
    }
  }
  return changed ? next : scope;
}

/**
 * Human-readable one-line scope summary for the save review dialog. Prefers the
 * resolved names lifted from the editor (school/grade/room) and falls back to
 * the ids in dataScope for any level whose name has not resolved yet.
 */
function describeDataScope(
  scope: DataScope,
  scopePolicy: string,
  labels: ScopeSelectionLabels | null,
): string {
  if (scopePolicy === "OWN_ONLY" || scope.own_only === true) {
    return "เฉพาะข้อมูลของตนเอง";
  }
  const segments: string[] = [];
  const push = (label: string, name: string, ids: unknown[] | undefined, fallback: string) => {
    if (name) {
      segments.push(`${label}: ${name}`);
    } else if (ids?.length) {
      segments.push(fallback);
    }
  };
  push("จังหวัด", labels?.province ?? "", scope.provinces, `จังหวัด ${scope.provinces?.length} รายการ`);
  push("อำเภอ/เขต", labels?.district ?? "", scope.districts, `อำเภอ/เขต ${scope.districts?.length} รายการ`);
  push("ตำบล/แขวง", labels?.subDistrict ?? "", scope.sub_districts, `ตำบล/แขวง ${scope.sub_districts?.length} รายการ`);
  push("โรงเรียน", labels?.school ?? "", scope.school_ids, `โรงเรียน ${scope.school_ids?.length} แห่ง`);
  push("ระดับชั้น", labels?.grade ?? "", scope.grade_levels, `ระดับชั้น ${scope.grade_levels?.length} รายการ`);
  push("ห้อง", labels?.room ?? "", scope.room_ids, `ห้อง ${scope.room_ids?.length} รายการ`);
  return segments.length > 0 ? segments.join(" · ") : "ทั้งประเทศ (ทุกจังหวัด)";
}

function resolveBaseline(
  role: string,
  rolesCatalog: RoleDefinition[],
): string[] {
  const definition = rolesCatalog.find((item) => item.name === role);
  if (definition?.default_permissions?.length) {
    return definition.default_permissions;
  }
  return [];
}

function toDefaults(user: ManagedUser | null): UserFormValues {
  if (!user) {
    return EMPTY_USER_FORM;
  }
  return {
    username: user.username,
    password: "",
    FirstName: user.FirstName ?? "",
    LastName: user.LastName ?? "",
    PersonID_Onec: user.PersonID_Onec ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    affiliation: user.affiliation ?? "",
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
    status: user.status || "ACTIVE",
  };
}

/** The actual form — mounted only once `user` is resolved so RHF gets correct defaults. */
function UserForm({
  activeTab,
  user,
  rolesCatalog,
}: {
  activeTab: "all" | "info" | "permissions";
  user: ManagedUser | null;
  rolesCatalog: RoleDefinition[];
}) {
  const navigate = useNavigate();
  const saveUser = useSaveUser();
  const isEdit = Boolean(user?.id);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const initialRole = user?.role || user?.roles?.[0] || "";
  const initialScopeMode =
    rolesCatalog.find((item) => item.name === initialRole)?.scope_mode ?? "flexible";
  const [permissions, setPermissions] = useState(
    user?.permissions?.length
      ? user.permissions
      : resolveBaseline(initialRole, rolesCatalog),
  );
  const [dataScope, setDataScope] = useState(() =>
    clearForbiddenScopeFields(user?.data_scope ?? {}, initialScopeMode),
  );
  const form = useForm<UserFormValues>({
    defaultValues: toDefaults(user),
    resolver: zodResolver(userFormSchema),
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  const selectedStatus = useWatch({ control: form.control, name: "status" });
  const locationQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
  });
  const geocode = useMutation({
    mutationFn: geoService.geocodeProfileAddress,
    onSuccess: (result) => {
      if (!result) return;
      form.setValue("address_latitude", result.lat, { shouldDirty: true });
      form.setValue("address_longitude", result.lng, { shouldDirty: true });
      if (result.postalCode) {
        form.setValue("address_postal_code", result.postalCode, { shouldDirty: true });
      }
    },
    throwOnError: false,
  });

  const roleDefinition = useMemo(
    () => rolesCatalog.find((item) => item.name === selectedRole),
    [rolesCatalog, selectedRole],
  );
  const baseline = useMemo(
    () => resolveBaseline(selectedRole, rolesCatalog),
    [selectedRole, rolesCatalog],
  );
  const scopeMode = roleDefinition?.scope_mode ?? "flexible";
  const scopePolicy = roleDefinition?.scope_policy ?? "ASSIGNABLE";
  const roleLabel = roleDefinition?.label ?? ROLE_LABELS[selectedRole] ?? selectedRole;

  // Adjust dependent state when the role changes — done during render (React's
  // recommended pattern) rather than in an effect: keep the permission set in
  // step with the new role's standard set until the user customises it, and
  // drop any scope levels the new role is not allowed to set.
  const [trackedRole, setTrackedRole] = useState(selectedRole);
  if (selectedRole !== trackedRole) {
    setTrackedRole(selectedRole);
    setPermissions(baseline);
    setDataScope((current) => {
      const next = clearForbiddenScopeFields(current, scopeMode);
      if (scopePolicy === "OWN_ONLY") {
        return { ...next, global: undefined, own_only: true };
      }
      return { ...next, own_only: undefined };
    });
  }

  const scopeError = getScopeValidationError(scopeMode, dataScope, roleLabel, scopePolicy);
  const isCustomized = !sameSet(permissions, baseline);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<UserFormValues | null>(null);
  const [scopeLabels, setScopeLabels] = useState<ScopeSelectionLabels | null>(null);
  const handleScopeLabelsChange = useCallback(
    (labels: ScopeSelectionLabels) => setScopeLabels(labels),
    [],
  );
  const { labelOf } = usePermissionCatalog();

  // A flexible role with no area selected = nationwide access. Highlighted in
  // the review dialog before saving (there is no longer a dedicated checkbox).
  const isNationwideScope =
    scopeMode === "flexible" &&
    scopePolicy !== "OWN_ONLY" &&
    dataScope.own_only !== true &&
    ([
      dataScope.provinces,
      dataScope.districts,
      dataScope.sub_districts,
      dataScope.school_ids,
      dataScope.grade_levels,
      dataScope.room_ids,
    ].every((values) => !Array.isArray(values) || values.length === 0));

  function goBack(): void {
    if (isEdit) {
      void navigate(-1);
      return;
    }
    void navigate(MANAGE_USERS_PATH);
  }

  // Step 1: validate scope, then open the review dialog for a final recheck.
  function handleSubmit(values: UserFormValues): void {
    if (scopeError) {
      document
        .getElementById("user-permission-scope")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPendingValues(values);
    setReviewOpen(true);
  }

  // Step 2: user confirmed in the review dialog — build the payload and save.
  function confirmSave(): void {
    if (!pendingValues) {
      return;
    }
    const values = pendingValues;
    const role = values.role.trim();
    const password = normalizeOptionalText(values.password);
    const phone = normalizeOptionalText(values.phone);
    const email = normalizeOptionalText(values.email);
    const affiliation = normalizeOptionalText(values.affiliation);

    const payload: UserSavePayload = {
      id: user?.id ?? null,
      username: values.username.trim(),
      FirstName: values.FirstName.trim(),
      LastName: values.LastName.trim(),
      PersonID_Onec: values.PersonID_Onec.trim(),
      role,
      roles: [role],
      permissions: isCustomized ? permissions : [],
      status: values.status,
      data_scope: dataScope,
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
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(affiliation ? { affiliation } : {}),
      ...(password ? { password } : {}),
    };

    saveUser.mutate(
      { id: user?.id ?? null, payload },
      {
        onSuccess: (response) => {
          setReviewOpen(false);
          if (!isEdit && response?.tempPassword) {
            setGeneratedPassword(response.tempPassword);
            return;
          }
          goBack();
        },
        onError: () => setReviewOpen(false),
      },
    );
  }

  const reviewData: UserSaveReview | null = pendingValues
    ? {
        isEdit,
        fullName: `${pendingValues.FirstName} ${pendingValues.LastName}`.trim(),
        username: pendingValues.username.trim(),
        email: normalizeOptionalText(pendingValues.email) ?? null,
        phone: normalizeOptionalText(pendingValues.phone) ?? null,
        affiliation: normalizeOptionalText(pendingValues.affiliation) ?? null,
        personId: pendingValues.PersonID_Onec.trim() || null,
        roleLabel,
        status: pendingValues.status,
        scopeText: describeDataScope(dataScope, scopePolicy, scopeLabels),
        isNationwide: isNationwideScope,
        isCustomized,
        permissions,
        addedPermissions: permissions.filter((permission) => !baseline.includes(permission)),
        removedPermissions: baseline.filter((permission) => !permissions.includes(permission)),
      }
    : null;

  return (
    <>
      <Form form={form} onSubmit={handleSubmit}>
        <Card className="p-6">
          <FormErrorAlert
            className="mb-4"
            error={saveUser.error}
            fallback="บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

          {activeTab !== "permissions" ? (
          <>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="username" required>
                ชื่อผู้ใช้งาน
              </FormLabel>
              <Input id="username" {...registerField(form, "username")} />
              <FormMessage<UserFormValues> name="username" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="password">
                {isEdit
                  ? "รหัสผ่าน (เว้นว่างเพื่อคงเดิม)"
                  : "รหัสผ่าน (เว้นว่างเพื่อสร้างอัตโนมัติ)"}
              </FormLabel>
              <PasswordInput id="password" {...registerField(form, "password")} />
              <FormMessage<UserFormValues> name="password" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="FirstName" required>
                ชื่อ
              </FormLabel>
              <Input id="FirstName" {...registerField(form, "FirstName")} />
              <FormMessage<UserFormValues> name="FirstName" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="LastName" required>
                นามสกุล
              </FormLabel>
              <Input id="LastName" {...registerField(form, "LastName")} />
              <FormMessage<UserFormValues> name="LastName" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="PersonID_Onec" required>
                เลขบัตรประชาชน
              </FormLabel>
              <NumericInput
                id="PersonID_Onec"
                maxLength={13}
                {...registerField(form, "PersonID_Onec")}
              />
              <FormMessage<UserFormValues> name="PersonID_Onec" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="phone">เบอร์โทร</FormLabel>
              <NumericInput id="phone" maxLength={10} {...registerField(form, "phone")} />
              <FormMessage<UserFormValues> name="phone" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="email">อีเมล</FormLabel>
              <Input id="email" type="email" {...registerField(form, "email")} />
              <FormMessage<UserFormValues> name="email" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="affiliation">สังกัด</FormLabel>
              <Input id="affiliation" {...registerField(form, "affiliation")} />
              <FormMessage<UserFormValues> name="affiliation" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="line_id">LINE ID</FormLabel>
              <Input id="line_id" {...registerField(form, "line_id")} />
              <FormMessage<UserFormValues> name="line_id" />
            </FormItem>
          </div>
          <div className="mt-6">
            <AddressFormSection
              catalog={locationQuery.data}
              disabled={saveUser.isPending}
              form={form}
              geocodeError={geocode.isError ? (
                <FormErrorAlert
                  error={geocode.error}
                  fallback="ค้นหาพิกัดไม่สำเร็จ กรุณาลองใหม่หรือปักหมุดบนแผนที่"
                />
              ) : null}
              isGeocoding={geocode.isPending}
              names={ADDRESS_NAMES}
              onGeocode={(address) => geocode.mutate(address)}
              showPlaceholders={!isEdit}
              title="ที่อยู่ติดต่อ"
            />
          </div>
          </>
          ) : null}

          {activeTab !== "info" ? (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="role" required>
                ตำแหน่ง
              </FormLabel>
              <Combobox
                aria-invalid={form.formState.errors.role ? true : undefined}
                id="role"
                name="role"
                onChange={(next) =>
                  form.setValue("role", next, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                options={[
                  { value: "", label: "เลือกตำแหน่ง" },
                  ...rolesCatalog.map((role) => ({
                    value: role.name,
                    label: role.label || ROLE_LABELS[role.name] || role.name,
                  })),
                ]}
                searchable={false}
                value={selectedRole}
              />
              <FormMessage<UserFormValues> name="role" />
            </FormItem>

            {!isEdit ? (
              <FormItem>
                <FormLabel htmlFor="status">สถานะ</FormLabel>
                <Combobox
                  id="status"
                  name="status"
                  onChange={(next) =>
                    form.setValue("status", next, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                  options={USER_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  searchable={false}
                  value={selectedStatus}
                />
                <FormMessage<UserFormValues> name="status" />
              </FormItem>
            ) : null}
          </div>
          ) : null}

          {activeTab !== "info" ? (
          <div className="mt-4" id="user-permission-scope">
            <PermissionScopeEditor
              baselinePermissions={baseline}
              dataScope={dataScope}
              disabled={saveUser.isPending}
              onDataScopeChange={setDataScope}
              onPermissionsChange={setPermissions}
              onScopeLabelsChange={handleScopeLabelsChange}
              permissions={permissions}
              role={selectedRole}
              roleLabel={roleLabel}
              scopeMode={scopeMode}
              scopePolicy={scopePolicy}
              showErrors={form.formState.isSubmitted}
            />
          </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          </div>
        </Card>
      </Form>

      <CredentialDialog
        onClose={() => {
          setGeneratedPassword("");
          goBack();
        }}
        open={Boolean(generatedPassword)}
        value={generatedPassword}
      />
      <UserSaveReviewDialog
        data={reviewData}
        labelOf={labelOf}
        isSubmitting={saveUser.isPending}
        onClose={() => setReviewOpen(false)}
        onConfirm={confirmSave}
        open={reviewOpen}
      />
    </>
  );
}

export function ManageUserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : null;
  const {
    data: user = null,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useUser(Number.isInteger(userId) ? userId : null);
  const {
    rolesCatalog,
    isLoading: isRolesLoading,
    isError: isRolesError,
    refetch: refetchRoles,
  } = useRolesCatalog();
  const [activeTab, setActiveTab] = useState<"info" | "permissions">("info");

  return (
    <PageShell>
      <PageToolbar
        icon={UserCog}
        title={isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
        description="กรอกข้อมูลผู้ใช้งานและกำหนดสิทธิ์การเข้าถึง"
        actions={isEdit ? (
          <Tabs
            aria-label="โหมดแก้ไขผู้ใช้งาน"
            onChange={(value) => setActiveTab(value === "permissions" ? "permissions" : "info")}
            options={[
              { value: "info", label: "ข้อมูล" },
              { value: "permissions", label: "สิทธิ์" },
            ]}
            value={activeTab}
          />
        ) : undefined}
        footerActions={
          isEdit ? (
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          ) : (
            <NavButton icon={ArrowLeft} to={MANAGE_USERS_PATH} variant="outline">
              ย้อนกลับ
            </NavButton>
          )
        }
      />

      {isRolesLoading || (isEdit && isUserLoading && !user) ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isRolesError ? (
        <ErrorState
          title="ไม่สามารถโหลดข้อมูลตำแหน่งได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดตำแหน่งและนโยบายขอบเขตข้อมูล"
          onRetry={refetchRoles}
        />
      ) : isEdit && (isUserError || !user) ? (
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข"
          retryLabel="กลับไปรายการผู้ใช้งาน"
          onRetry={() => void navigate(MANAGE_USERS_PATH)}
        />
      ) : (
        <UserForm
          activeTab={isEdit ? activeTab : "all"}
          user={user}
          rolesCatalog={rolesCatalog}
        />
      )}
    </PageShell>
  );
}
