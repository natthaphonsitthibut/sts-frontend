import { zodResolver } from "@hookform/resolvers/zod";
import { PanelsTopLeft } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  InfoTooltip,
  Input,
  Skeleton,
  registerField,
} from "../../../components/base";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { useSaveRoleGroup } from "../hooks/useRoleGroups";
import {
  roleGroupFormSchema,
  type RoleGroupFormValues,
} from "../schemas/role-group.schema";
import type { RoleDefinition } from "../types/admin.types";

interface RoleGroupDialogProps {
  maxRank: number;
  onOpenChange: (open: boolean) => void;
  roleGroup: RoleDefinition | null;
  schoolId: number;
  schoolName: string;
}

export function RoleGroupDialog({
  maxRank,
  onOpenChange,
  roleGroup,
  schoolId,
  schoolName,
}: RoleGroupDialogProps) {
  const saveRoleGroup = useSaveRoleGroup();
  const form = useForm<RoleGroupFormValues>({
    defaultValues: {
      label: roleGroup?.label ?? "",
      rank: String(roleGroup?.rank ?? 1),
    },
    resolver: zodResolver(roleGroupFormSchema),
  });
  const [permissions, setPermissions] = useState<string[]>(
    roleGroup?.default_permissions ?? [],
  );
  const { catalog: permissionOptions, isLoading: permissionsLoading } =
    usePermissionCatalog();
  const selectedRank = useWatch({ control: form.control, name: "rank" });
  const rankOptions = Array.from({ length: Math.max(1, maxRank) }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const hasNoPermissions = permissions.length === 0;
  const isEdit = Boolean(roleGroup);

  function handleOpenChange(open: boolean): void {
    if (!open) saveRoleGroup.reset();
    onOpenChange(open);
  }

  function togglePermission(permission: string): void {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  function handleSubmit(values: RoleGroupFormValues): void {
    if (hasNoPermissions) return;
    saveRoleGroup.mutate(
      {
        originalName: roleGroup?.name ?? null,
        payload: {
          schoolId,
          label: values.label.trim(),
          rank: Number(values.rank),
          default_permissions: permissions,
        },
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto"
        onClose={() => handleOpenChange(false)}
      >
        <Form form={form} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle icon={PanelsTopLeft}>
              {isEdit ? "แก้ไขกลุ่มเมนู" : "เพิ่มกลุ่มเมนู"}
            </DialogTitle>
            <DialogDescription>
              กำหนดชื่อและเมนูสำหรับ {schoolName} โดยกลุ่มนี้จะใช้ได้เฉพาะโรงเรียนนี้
            </DialogDescription>
          </DialogHeader>

          <FormErrorAlert
            className="mt-4"
            error={saveRoleGroup.error}
            fallback="บันทึกกลุ่มเมนูไม่สำเร็จ กรุณาลองอีกครั้ง"
          />

          <div className="mt-5 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(0,1fr)_240px]">
            <FormItem>
              <div className="flex h-5 items-baseline">
                <FormLabel className="mb-0" htmlFor="menu-group-label" required>
                  ชื่อกลุ่มเมนู
                </FormLabel>
              </div>
              <Input
                id="menu-group-label"
                placeholder="กรอกชื่อกลุ่มเมนู"
                {...registerField(form, "label")}
              />
              <FormMessage<RoleGroupFormValues> name="label" />
            </FormItem>

            <FormItem>
              <div className="flex h-5 items-baseline justify-between gap-2">
                <FormLabel className="mb-0" htmlFor="menu-group-rank" required>
                  ลำดับสิทธิ์
                </FormLabel>
                <div className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-slate-700">
                  <span>เกณฑ์การจัดระดับ</span>
                  <InfoTooltip
                    align="end"
                    contentClassName="w-72 max-w-[calc(100vw-3rem)]"
                    label="เกณฑ์การจัดลำดับสิทธิ์"
                    triggerClassName="size-5"
                  >
                    <div className="space-y-2">
                      <p>
                        ลำดับสิทธิ์ใช้กำหนดระดับอำนาจในการจัดการบัญชีและกลุ่มเมนู
                        ไม่ใช่จำนวนเมนูที่เข้าถึง
                      </p>
                      <ul className="list-disc space-y-1 pl-4">
                        <li>เลขมากหมายถึงระดับอำนาจสูงกว่า</li>
                        <li>
                          จัดการได้เฉพาะระดับที่ต่ำกว่า
                          โดยผู้ดูแลระบบสามารถจัดการระดับเท่ากันได้
                        </li>
                        <li>เมนูที่เข้าถึงจริงยึดตามรายการที่เลือกด้านล่าง</li>
                      </ul>
                    </div>
                  </InfoTooltip>
                </div>
              </div>
              <Combobox
                aria-invalid={form.formState.errors.rank ? true : undefined}
                id="menu-group-rank"
                onChange={(value) =>
                  form.setValue("rank", value, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                options={rankOptions}
                searchable={false}
                value={selectedRank}
              />
              <FormMessage<RoleGroupFormValues> name="rank" />
            </FormItem>
          </div>

          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">เมนูที่เข้าถึงได้</p>
              <span className="text-xs font-medium tabular-nums text-slate-500">
                เลือกแล้ว {permissions.length} รายการ
              </span>
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              {permissionsLoading
                ? Array.from({ length: 8 }, (_, index) => (
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
            <p
              className={`mt-2 min-h-5 text-sm font-medium text-red-600 ${
                hasNoPermissions ? "" : "invisible"
              }`}
            >
              กรุณาเลือกเมนูอย่างน้อย 1 รายการ
            </p>
          </div>

          <DialogFooter className="grid grid-cols-2 sm:grid">
            <Button
              disabled={saveRoleGroup.isPending}
              fullWidth
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={hasNoPermissions}
              fullWidth
              isLoading={saveRoleGroup.isPending}
              loadingText="กำลังบันทึก"
              type="submit"
            >
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
