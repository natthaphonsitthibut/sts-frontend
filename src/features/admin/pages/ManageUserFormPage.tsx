import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
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
  ROLE_BASELINES,
  ROLE_LABELS,
  type DataScope,
} from "../../auth/lib/permissions";
import {
  getScopeFieldStates,
  getScopeValidationError,
} from "../../auth/lib/scope-validation";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import { useRolesCatalog, useSaveUser, useUsers } from "../hooks/useUsers";
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

function resolveBaseline(
  role: string,
  rolesCatalog: RoleDefinition[],
): string[] {
  const definition = rolesCatalog.find((item) => item.name === role);
  if (definition?.default_permissions?.length) {
    return definition.default_permissions;
  }
  return ROLE_BASELINES[role] ?? [];
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
    role: user.role || user.roles?.[0] || "",
    status: user.status || "ACTIVE",
  };
}

/** The actual form — mounted only once `user` is resolved so RHF gets correct defaults. */
function UserForm({
  user,
  rolesCatalog,
}: {
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

  const roleDefinition = useMemo(
    () => rolesCatalog.find((item) => item.name === selectedRole),
    [rolesCatalog, selectedRole],
  );
  const baseline = useMemo(
    () => resolveBaseline(selectedRole, rolesCatalog),
    [selectedRole, rolesCatalog],
  );
  const scopeMode = roleDefinition?.scope_mode ?? "flexible";
  const roleLabel = roleDefinition?.label ?? ROLE_LABELS[selectedRole] ?? selectedRole;

  // Adjust dependent state when the role changes — done during render (React's
  // recommended pattern) rather than in an effect: keep the permission set in
  // step with the new role's standard set until the user customises it, and
  // drop any scope levels the new role is not allowed to set.
  const [trackedRole, setTrackedRole] = useState(selectedRole);
  if (selectedRole !== trackedRole) {
    setTrackedRole(selectedRole);
    setPermissions(baseline);
    setDataScope((current) => clearForbiddenScopeFields(current, scopeMode));
  }

  const scopeError = getScopeValidationError(scopeMode, dataScope, roleLabel);
  const isCustomized = !sameSet(permissions, baseline);

  function goBack(): void {
    void navigate(MANAGE_USERS_PATH);
  }

  function handleSubmit(values: UserFormValues): void {
    if (scopeError) {
      document
        .getElementById("user-permission-scope")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

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
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(affiliation ? { affiliation } : {}),
      ...(password ? { password } : {}),
    };

    saveUser.mutate(
      { id: user?.id ?? null, payload },
      {
        onSuccess: (response) => {
          if (!isEdit && response?.tempPassword) {
            setGeneratedPassword(response.tempPassword);
            return;
          }
          goBack();
        },
      },
    );
  }

  return (
    <>
      <Form form={form} onSubmit={handleSubmit}>
        <Card className="p-6">
          <FormErrorAlert
            className="mb-4"
            error={saveUser.error}
            fallback="บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

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
          </div>

          <div className="mt-4" id="user-permission-scope">
            <PermissionScopeEditor
              baselinePermissions={baseline}
              dataScope={dataScope}
              disabled={saveUser.isPending}
              onDataScopeChange={setDataScope}
              onPermissionsChange={setPermissions}
              permissions={permissions}
              role={selectedRole}
              roleLabel={roleLabel}
              scopeMode={scopeMode}
              showErrors={form.formState.isSubmitted}
            />
          </div>

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
    </>
  );
}

export function ManageUserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { users, isLoading, isError } = useUsers();
  const rolesCatalog = useRolesCatalog();
  const user = isEdit ? users.find((item) => String(item.id) === id) ?? null : null;

  return (
    <PageShell>
      <PageToolbar
        icon={UserCog}
        title={isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
        description="กรอกข้อมูลผู้ใช้งานและกำหนดสิทธิ์การเข้าถึง"
        actions={
          <NavButton icon={ArrowLeft} to={MANAGE_USERS_PATH} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
      />

      {isEdit && isLoading && !user ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isEdit && (isError || !user) ? (
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข"
          retryLabel="กลับไปรายการผู้ใช้งาน"
          onRetry={() => void navigate(MANAGE_USERS_PATH)}
        />
      ) : (
        <UserForm user={user} rolesCatalog={rolesCatalog} />
      )}
    </PageShell>
  );
}
