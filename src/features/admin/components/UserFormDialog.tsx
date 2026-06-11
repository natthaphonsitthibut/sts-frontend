import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  Select,
} from "../../../components/base";
import { ROLE_LABELS } from "../../auth/lib/permissions";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import { useSaveUser } from "../hooks/useUsers";
import {
  EMPTY_USER_FORM,
  userFormSchema,
  type UserFormValues,
} from "../schemas/user.schema";
import { USER_STATUS_OPTIONS } from "../lib/admin-presentation";
import type {
  ManagedUser,
  RoleDefinition,
  UserSavePayload,
} from "../types/admin.types";

interface UserFormDialogProps {
  user: ManagedUser | null;
  rolesCatalog: RoleDefinition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function UserFormDialog({
  user,
  rolesCatalog,
  open,
  onOpenChange,
}: UserFormDialogProps) {
  const saveUser = useSaveUser();
  const isEdit = Boolean(user?.id);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [customizePermissions, setCustomizePermissions] = useState(
    Boolean(user?.permissions?.length),
  );
  const [permissions, setPermissions] = useState(user?.permissions ?? []);
  const [dataScope, setDataScope] = useState(user?.data_scope ?? {});
  const { reset: resetSaveUser } = saveUser;
  const form = useForm<UserFormValues>({
    defaultValues: toDefaults(user),
    resolver: zodResolver(userFormSchema),
  });
  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setGeneratedPassword("");
      resetSaveUser();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: UserFormValues): void {
    const payload: UserSavePayload = {
      id: user?.id ?? null,
      username: values.username,
      FirstName: values.FirstName,
      LastName: values.LastName,
      PersonID_Onec: values.PersonID_Onec,
      phone: values.phone,
      email: values.email,
      affiliation: values.affiliation,
      role: values.role,
      roles: [values.role],
      permissions: customizePermissions ? permissions : [],
      status: values.status,
      data_scope: dataScope,
    };
    if (values.password.trim()) {
      payload.password = values.password.trim();
    }

    saveUser.mutate(
      { id: user?.id ?? null, payload },
      {
        onSuccess: (response) => {
          if (!isEdit && response?.tempPassword) {
            setGeneratedPassword(response.tempPassword);
            return;
          }
          onOpenChange(false);
        },
      },
    );
  }

  function copyGeneratedPassword(): void {
    if (!generatedPassword) {
      return;
    }
    void navigator.clipboard?.writeText(generatedPassword);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[min(92vw,560px)]"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}</DialogTitle>
        </DialogHeader>

        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            {saveUser.isError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>
                  บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง
                </AlertDescription>
              </Alert>
            ) : null}

            {generatedPassword ? (
              <Alert className="mb-4" variant="warning">
                <AlertDescription>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      รหัสผ่านชั่วคราว:{" "}
                      <span className="font-mono font-bold">{generatedPassword}</span>
                    </div>
                    <Button
                      icon={Copy}
                      onClick={copyGeneratedPassword}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      คัดลอก
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="username">ชื่อผู้ใช้งาน</FormLabel>
                <Input id="username" {...form.register("username")} />
                <FormMessage<UserFormValues> name="username" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="password">
                  {isEdit
                    ? "รหัสผ่าน (เว้นว่างเพื่อคงเดิม)"
                    : "รหัสผ่าน (เว้นว่างเพื่อสร้างอัตโนมัติ)"}
                </FormLabel>
                <PasswordInput id="password" {...form.register("password")} />
                <FormMessage<UserFormValues> name="password" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="FirstName">ชื่อ</FormLabel>
                <Input id="FirstName" {...form.register("FirstName")} />
                <FormMessage<UserFormValues> name="FirstName" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="LastName">นามสกุล</FormLabel>
                <Input id="LastName" {...form.register("LastName")} />
                <FormMessage<UserFormValues> name="LastName" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="PersonID_Onec">เลขบัตรประชาชน</FormLabel>
                <Input id="PersonID_Onec" {...form.register("PersonID_Onec")} />
                <FormMessage<UserFormValues> name="PersonID_Onec" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="phone">เบอร์โทร</FormLabel>
                <Input id="phone" {...form.register("phone")} />
                <FormMessage<UserFormValues> name="phone" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="email">อีเมล</FormLabel>
                <Input id="email" type="email" {...form.register("email")} />
                <FormMessage<UserFormValues> name="email" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="affiliation">สังกัด</FormLabel>
                <Input id="affiliation" {...form.register("affiliation")} />
                <FormMessage<UserFormValues> name="affiliation" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="role">ตำแหน่ง</FormLabel>
                <Select id="role" {...form.register("role")}>
                  <option value="">เลือกตำแหน่ง</option>
                  {rolesCatalog.map((role) => (
                    <option key={role.name} value={role.name}>
                      {role.label || ROLE_LABELS[role.name] || role.name}
                    </option>
                  ))}
                </Select>
                <FormMessage<UserFormValues> name="role" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="status">สถานะ</FormLabel>
                <Select id="status" {...form.register("status")}>
                  {USER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <FormMessage<UserFormValues> name="status" />
              </FormItem>
            </div>

            <div className="mt-4">
              <PermissionScopeEditor
                customizePermissions={customizePermissions}
                dataScope={dataScope}
                disabled={saveUser.isPending || Boolean(generatedPassword)}
                onCustomizePermissionsChange={setCustomizePermissions}
                onDataScopeChange={setDataScope}
                onPermissionsChange={setPermissions}
                permissions={permissions}
                role={selectedRole}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant={generatedPassword ? "default" : "ghost"}
            >
              {generatedPassword ? "เสร็จสิ้น" : "ยกเลิก"}
            </Button>
            {!generatedPassword ? (
              <Button
                isLoading={saveUser.isPending}
                loadingText="กำลังบันทึก"
                type="submit"
              >
                บันทึก
              </Button>
            ) : null}
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
