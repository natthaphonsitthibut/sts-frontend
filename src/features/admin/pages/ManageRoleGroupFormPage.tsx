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
  registerField,
  Skeleton,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { useRoleGroups, useSaveRoleGroup } from "../hooks/useRoleGroups";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import {
  roleGroupFormSchema,
  type RoleGroupFormValues,
} from "../schemas/role-group.schema";
import type { RoleDefinition } from "../types/admin.types";

const MANAGE_ROLE_GROUPS_PATH = "/manage-role-groups";
/** The actual form — mounted only once the role group is resolved so RHF gets correct defaults. */
function RoleGroupForm({
  roleGroup,
  roleGroups,
}: {
  roleGroup: RoleDefinition | null;
  roleGroups: RoleDefinition[];
}) {
  const navigate = useNavigate();
  const saveRoleGroup = useSaveRoleGroup();
  const isEdit = Boolean(roleGroup);
  const form = useForm<RoleGroupFormValues>({
    defaultValues: {
      name: roleGroup?.name ?? "",
      label: roleGroup?.label ?? "",
      rank: String(roleGroup?.rank ?? 1),
    },
    resolver: zodResolver(roleGroupFormSchema),
  });
  const [permissions, setPermissions] = useState<string[]>(
    roleGroup?.default_permissions ?? [],
  );
  const hasNoPermissions = permissions.length === 0;
  const { catalog: permissionOptions, isLoading: permissionsLoading } = usePermissionCatalog();
  const rankRows = [...roleGroups].sort((left, right) => right.rank - left.rank);
  // Nobody (not even ADMIN) can create a role above the highest existing rank —
  // mirror the backend cap. Derived from the catalog, never hardcoded.
  const maxRank = rankRows[0]?.rank ?? 1;
  const selectedRank = useWatch({ control: form.control, name: "rank" });
  const rankOptions = Array.from({ length: maxRank }, (_, index) => {
    const value = String(index + 1);
    return { value, label: value };
  });

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
    const rankValue = Number(values.rank);
    if (!Number.isInteger(rankValue) || rankValue < 1 || rankValue > maxRank) {
      form.setError("rank", {
        message: `ลำดับขั้นต้องอยู่ระหว่าง 1 ถึง ${maxRank}`,
      });
      return;
    }
    saveRoleGroup.mutate(
      {
        originalName: roleGroup?.name ?? null,
        payload: {
          name: values.name,
          label: values.label,
          rank: Number(values.rank),
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
              placeholder="เช่น CASE_COORDINATOR"
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
            <Combobox
              aria-describedby="role-rank-description"
              aria-invalid={form.formState.errors.rank ? true : undefined}
              id="role-rank"
              onChange={(next) =>
                form.setValue("rank", next, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              options={rankOptions}
              searchable={false}
              value={selectedRank}
            />
            <p className="text-sm text-slate-500" id="role-rank-description">
              เลขมากหมายถึงระดับสิทธิ์สูงกว่า ใช้กำหนดว่า role นี้สามารถจัดการ role ระดับใดได้ (สูงสุด {maxRank})
            </p>
            <FormMessage<RoleGroupFormValues> name="rank" />
          </FormItem>

          <div className="sm:col-span-2">
            <div className="mb-2 text-sm font-bold text-slate-700">ตารางลำดับสิทธิ์</div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-20 px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">ตำแหน่ง</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">รหัส role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankRows.map((role) => (
                    <tr key={role.id ?? role.name}>
                      <td className="px-3 py-2 font-bold tabular-nums text-slate-800">
                        {role.rank}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700">{role.label}</td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">
                        {role.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="mb-2 text-sm font-bold text-slate-700">
            สิทธิ์การเข้าถึง ({permissions.length})
          </div>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
            {permissionsLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton className="h-6 w-full" key={index} />
                ))
              : permissionOptions.map((option) => (
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
        description="กำหนดรหัส ชื่อ ลำดับขั้น และสิทธิ์การเข้าถึง โดยกำหนดขอบเขตข้อมูลตอนเพิ่มผู้ใช้"
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
        <RoleGroupForm roleGroup={roleGroup} roleGroups={roleGroups} />
      )}
    </PageShell>
  );
}
