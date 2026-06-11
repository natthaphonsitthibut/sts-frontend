import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Checkbox,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
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
        {saveRoleGroup.isError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              บันทึกกลุ่มสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel htmlFor="role-name">รหัส role</FormLabel>
            <Input
              disabled={isEdit}
              id="role-name"
              placeholder="เช่น ADMIN_SCHOOL"
              {...form.register("name")}
            />
            <FormMessage<RoleGroupFormValues> name="name" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-label">ชื่อที่แสดง</FormLabel>
            <Input id="role-label" {...form.register("label")} />
            <FormMessage<RoleGroupFormValues> name="label" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-rank">ลำดับขั้น (rank)</FormLabel>
            <Input id="role-rank" type="number" {...form.register("rank")} />
            <FormMessage<RoleGroupFormValues> name="rank" />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="role-scope">ขอบเขตข้อมูล</FormLabel>
            <Select id="role-scope" {...form.register("scope_mode")}>
              {SCOPE_MODE_ENTRIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
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
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={goBack} size="lg" type="button" variant="ghost">
            ยกเลิก
          </Button>
          <Button
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
