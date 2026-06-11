import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Link2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
} from "../../../components/base";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import type { DataScope } from "../../auth/lib/permissions";
import { useCreateLoginLink, useLoginLinkRoles } from "../hooks/useLoginLinks";
import {
  getLoginLinkUrl,
  LOGIN_LINK_DURATION_UNITS,
} from "../lib/login-links-presentation";
import {
  EMPTY_LOGIN_LINK_FORM,
  loginLinkFormSchema,
  type LoginLinkFormValues,
} from "../schemas/login-link.schema";
import type { LoginLinkDurationUnit } from "../types/login-links.types";
import { CopyButton } from "../components/CopyButton";

const LOGIN_LINKS_PATH = "/login-links";

export function LoginLinkFormPage() {
  const navigate = useNavigate();
  const roles = useLoginLinkRoles();
  const createLoginLink = useCreateLoginLink();
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState<DataScope>({});
  const form = useForm<LoginLinkFormValues>({
    defaultValues: EMPTY_LOGIN_LINK_FORM,
    resolver: zodResolver(loginLinkFormSchema),
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });

  function goBack(): void {
    void navigate(LOGIN_LINKS_PATH);
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
    <PageShell>
      <PageToolbar
        icon={Link2}
        title="สร้างลิงก์เข้าสู่ระบบ"
        description="สร้าง magic link สำหรับให้ผู้ใช้เข้าสู่ระบบตามตำแหน่งที่กำหนด"
        actions={
          <Button icon={ArrowLeft} onClick={goBack} variant="outline">
            ย้อนกลับ
          </Button>
        }
      />

      {createLoginLink.isSuccess ? (
        <Card className="p-6">
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
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={goBack} size="lg" variant="ghost">
              เสร็จสิ้น
            </Button>
            <CopyButton size="lg" value={generatedUrl} variant="default" />
          </div>
        </Card>
      ) : (
        <Form form={form} onSubmit={handleSubmit}>
          <Card className="p-6">
            {createLoginLink.isError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>สร้างลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง</AlertDescription>
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

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={goBack} size="lg" type="button" variant="ghost">
                ยกเลิก
              </Button>
              <Button
                isLoading={createLoginLink.isPending}
                loadingText="กำลังสร้าง"
                size="lg"
                type="submit"
              >
                สร้างลิงก์
              </Button>
            </div>
          </Card>
        </Form>
      )}
    </PageShell>
  );
}
