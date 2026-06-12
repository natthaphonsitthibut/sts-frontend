import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  Checkbox,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  registerField,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { useRoleGroups, useSaveRoleGroup } from "../hooks/useRoleGroups";
import {
  getAssignablePermissions,
  ROLE_SCOPE_MODE_LABELS,
} from "../lib/admin-presentation";
import {
  roleGroupFormSchema,
  type RoleGroupFormValues,
} from "../schemas/role-group.schema";
import type { RoleDefinition, RoleScopeMode } from "../types/admin.types";

const MANAGE_ROLE_GROUPS_PATH = "/manage-role-groups";
const PERMISSION_OPTIONS = getAssignablePermissions();
const SCOPE_MODE_ENTRIES = Object.entries(ROLE_SCOPE_MODE_LABELS) as Array<
  [RoleScopeMode, string]
>;

/** The actual form — mounted only once the role group is resolved so RHF gets correct defaults. */
function RoleGroupForm({ roleGroup }: { roleGroup: RoleDefinition | null }) {
  const navigate = useNavigate();
  const saveRoleGroup = useSaveRoleGroup();
  const isEdit = Boolean(roleGroup);
  const form = useForm<RoleGroupFormValues>({
    defaultValues: {
      name: roleGroup?.name ?? "",
      label: roleGroup?.label ?? "",
      rank: String(roleGroup?.rank ?? 1),
      scope_mode: roleGroup?.scope_mode ?? "flexible",
    },
    resolver: zodResolver(roleGroupFormSchema),
  });
  const [permissions, setPermissions] = useState<string[]>(
    roleGroup?.default_permissions ?? [],
  );
  const hasNoPermissions = permissions.length === 0;
  const scopeMode = useWatch({ control: form.control, name: "scope_mode" });

  function goBack(): void {
    void navigate(MANAGE_ROLE_GROUPS_PATH);
  }

  function togglePermission(id: string): void {
    setPermissions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleSubmit(values: RoleGroupFormValues): void {
    if (hasNoPermissions) {
      return;
    }
    saveRoleGroup.mutate(
      {
        originalName: roleGroup?.name ?? null,
        payload: {
          name: values.name,
          label: values.label,
          rank: Number(values.rank),
          scope_mode: values.scope_mode,
          default_permissions: permissions,
        },
      },
      { onSuccess: goBack },
    );
  }

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Card className="p-6">
        <FormErrorAlert
          className="mb-4"
          error={saveRoleGroup.error}
          fallback="บันทึกกลุ่มสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง"
        />

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel htmlFor="role-name" required>
              รหัส role
            </FormLabel>
            <Input
              disabled={isEdit}
              id="role-name"
              placeholder="เช่น ADMIN_SCHOOL"
              {...registerField(form, "name")}
            />
            <FormMessage<RoleGroupFormValues> name="name" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-label" required>
              ชื่อที่แสดง
            </FormLabel>
            <Input id="role-label" {...registerField(form, "label")} />
            <FormMessage<RoleGroupFormValues> name="label" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-rank" required>
              ลำดับขั้น (rank)
            </FormLabel>
            <NumericInput id="role-rank" maxLength={2} {...registerField(form, "rank")} />
            <FormMessage<RoleGroupFormValues> name="rank" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-scope">ขอบเขตข้อมูล</FormLabel>
            <Combobox
              id="role-scope"
              name="scope_mode"
              onChange={(next) =>
                form.setValue("scope_mode", next as RoleGroupFormValues["scope_mode"], {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              options={SCOPE_MODE_ENTRIES.map(([value, label]) => ({ value, label }))}
              searchable={false}
              value={scopeMode}
            />
            <FormMessage<RoleGroupFormValues> name="scope_mode" />
          </FormItem>
        </div>

        <div className="mt-2">
          <div className="mb-2 text-sm font-bold text-slate-700">
            สิทธิ์การเข้าถึง ({permissions.length})
          </div>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
            {PERMISSION_OPTIONS.map((option) => (
              <Checkbox
                checked={permissions.includes(option.id)}
                key={option.id}
                label={option.label}
                onChange={() => togglePermission(option.id)}
              />
            ))}
          </div>
          <p className={`mt-2 text-sm font-medium text-red-600 ${hasNoPermissions ? "" : "invisible"}`}>
            กรุณาเลือกสิทธิ์อย่างน้อย 1 รายการ
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={goBack} size="lg" type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button
            disabled={hasNoPermissions}
            isLoading={saveRoleGroup.isPending}
            loadingText="กำลังบันทึก"
            size="lg"
            type="submit"
          >
            บันทึก
          </Button>
        </div>
      </Card>
    </Form>
  );
}

export function ManageRoleGroupFormPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(name);
  const { roleGroups, isLoading, isError } = useRoleGroups();
  const roleGroup = isEdit
    ? roleGroups.find((item) => item.name === name) ?? null
    : null;

  return (
    <PageShell>
      <PageToolbar
        icon={ShieldCheck}
        title={isEdit ? "แก้ไขกลุ่มสิทธิ์" : "เพิ่มกลุ่มสิทธิ์"}
        description="กำหนดรหัส ชื่อ ลำดับขั้น ขอบเขตข้อมูล และสิทธิ์การเข้าถึง"
        actions={
          <NavButton icon={ArrowLeft} to={MANAGE_ROLE_GROUPS_PATH} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
      />

      {isEdit && isLoading && !roleGroup ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isEdit && (isError || !roleGroup) ? (
        <ErrorState
          title="ไม่พบกลุ่มสิทธิ์"
          description="ไม่พบข้อมูลกลุ่มสิทธิ์ที่ต้องการแก้ไข"
          retryLabel="กลับไปรายการกลุ่มสิทธิ์"
          onRetry={() => void navigate(MANAGE_ROLE_GROUPS_PATH)}
        />
      ) : (
        <RoleGroupForm roleGroup={roleGroup} />
      )}
    </PageShell>
  );
}
