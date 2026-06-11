import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
} from "../../../components/base";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import type { DataScope } from "../../auth/lib/permissions";
import { useCreateLoginLink } from "../hooks/useLoginLinks";
import { getLoginLinkUrl, LOGIN_LINK_DURATION_UNITS } from "../lib/login-links-presentation";
import {
  EMPTY_LOGIN_LINK_FORM,
  loginLinkFormSchema,
  type LoginLinkFormValues,
} from "../schemas/login-link.schema";
import type {
  LoginLinkDurationUnit,
  RoleOption,
} from "../types/login-links.types";
import { CopyButton } from "./CopyButton";

interface GenerateLoginLinkDialogProps {
  roles: RoleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateLoginLinkDialog({
  roles,
  open,
  onOpenChange,
}: GenerateLoginLinkDialogProps) {
  const createLoginLink = useCreateLoginLink();
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState<DataScope>({});
  const form = useForm<LoginLinkFormValues>({
    defaultValues: EMPTY_LOGIN_LINK_FORM,
    resolver: zodResolver(loginLinkFormSchema),
  });
  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.reset(EMPTY_LOGIN_LINK_FORM);
      createLoginLink.reset();
      setCustomizePermissions(false);
      setPermissions([]);
      setDataScope({});
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: LoginLinkFormValues): void {
    createLoginLink.mutate({
      task_type: "LOGIN",
      type: "LOGIN",
      assigned_to_name: values.assigned_to_name,
      assigned_to_email: values.assigned_to_email || null,
      role: values.role,
      permissions: customizePermissions ? permissions : [],
      data_scope: dataScope,
      expires_value: Number(values.expires_value),
      expires_unit: values.expires_unit as LoginLinkDurationUnit,
    });
  }

  const generatedUrl = createLoginLink.data
    ? getLoginLinkUrl(createLoginLink.data.magic_link)
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[min(92vw,520px)]"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>สร้างลิงก์เข้าสู่ระบบ</DialogTitle>
          <DialogDescription>
            สร้าง magic link สำหรับให้ผู้ใช้เข้าสู่ระบบตามตำแหน่งที่กำหนด
          </DialogDescription>
        </DialogHeader>

        {createLoginLink.isSuccess ? (
          <DialogBody>
            <Alert variant="success">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-bold">สร้างลิงก์สำเร็จ</div>
                  <div className="mt-2 break-all rounded-lg bg-white/60 p-2 text-xs text-slate-700">
                    {generatedUrl}
                  </div>
                </div>
              </div>
            </Alert>
            <DialogFooter>
              <CopyButton size="md" value={generatedUrl} variant="default" />
              <Button onClick={() => handleOpenChange(false)} variant="ghost">
                ปิด
              </Button>
            </DialogFooter>
          </DialogBody>
        ) : (
          <Form form={form} onSubmit={handleSubmit}>
            <DialogBody>
              {createLoginLink.isError ? (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>
                    สร้างลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="assigned_to_name">ชื่อผู้รับลิงก์</FormLabel>
                  <Input id="assigned_to_name" {...form.register("assigned_to_name")} />
                  <FormMessage<LoginLinkFormValues> name="assigned_to_name" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="assigned_to_email">อีเมล (ถ้ามี)</FormLabel>
                  <Input
                    id="assigned_to_email"
                    type="email"
                    {...form.register("assigned_to_email")}
                  />
                  <FormMessage<LoginLinkFormValues> name="assigned_to_email" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="role">ตำแหน่ง</FormLabel>
                  <Select id="role" {...form.register("role")}>
                    <option value="">เลือกตำแหน่ง</option>
                    {roles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                  <FormMessage<LoginLinkFormValues> name="role" />
                </FormItem>

                <FormItem>
                  <FormLabel>ระยะเวลาหมดอายุ</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      aria-label="จำนวน"
                      className="w-24"
                      type="number"
                      {...form.register("expires_value")}
                    />
                    <Select aria-label="หน่วย" {...form.register("expires_unit")}>
                      {LOGIN_LINK_DURATION_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <FormMessage<LoginLinkFormValues> name="expires_value" />
                </FormItem>
              </div>

              <div className="mt-4">
                <PermissionScopeEditor
                  customizePermissions={customizePermissions}
                  dataScope={dataScope}
                  disabled={createLoginLink.isPending}
                  onCustomizePermissionsChange={setCustomizePermissions}
                  onDataScopeChange={setDataScope}
                  onPermissionsChange={setPermissions}
                  permissions={permissions}
                  role={selectedRole}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} type="button" variant="ghost">
                ยกเลิก
              </Button>
              <Button
                isLoading={createLoginLink.isPending}
                loadingText="กำลังสร้าง"
                type="submit"
              >
                สร้างลิงก์
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
