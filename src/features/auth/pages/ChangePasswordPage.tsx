import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  PasswordInput,
  registerField,
} from "../../../components/base";
import { PageShell } from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { authService } from "../api/auth.service";
import {
  getEffectivePermissions,
  getFirstAccessibleRoute,
} from "../lib/permissions";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { ChangePasswordPayload } from "../types/auth.types";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
    newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่านใหม่"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "รหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthSessionStore((state) => state.user);
  const storageTarget = useAuthSessionStore((state) => state.storageTarget);
  const hasAdminAccess = useAuthSessionStore((state) => state.hasAdminAccess);
  const saveSession = useAuthSessionStore((state) => state.saveSession);
  const isForcedChange = user?.must_change_password === true;

  const form = useForm<ChangePasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    resolver: zodResolver(changePasswordSchema),
  });

  const changePassword = useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      authService.changeOwnPassword(payload),
    onSuccess: () => {
      if (user) {
        const updatedUser = { ...user, must_change_password: false };
        saveSession(updatedUser, {
          target: storageTarget ?? "local",
          hasAdminAccess,
        });
        const permissions = getEffectivePermissions(
          updatedUser.roles || [],
          updatedUser.permissions || [],
        );
        void navigate(isForcedChange ? getFirstAccessibleRoute(permissions) : "/profile", {
          replace: true,
        });
      }
    },
    throwOnError: false,
  });

  function handleSubmit(values: ChangePasswordFormValues): void {
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  return (
    <PageShell>
      <Card className="mx-auto max-w-[480px] rounded-lg">
        <CardHeader>
          <CardTitle as="h1" className="flex items-center gap-2 text-xl">
            <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
            เปลี่ยนรหัสผ่าน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleSubmit}>
            <div className="space-y-4">
              {changePassword.isError ? (
                <FormErrorAlert
                  error={changePassword.error}
                  fallback="เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบรหัสผ่านเดิมแล้วลองอีกครั้ง"
                />
              ) : isForcedChange ? (
                <Alert variant="warning">
                  <AlertDescription>
                    ต้องเปลี่ยนรหัสผ่านก่อนใช้งานส่วนอื่นของระบบ
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormItem>
                <FormLabel htmlFor="currentPassword">รหัสผ่านเดิม</FormLabel>
                <PasswordInput
                  autoComplete="current-password"
                  id="currentPassword"
                  {...registerField(form, "currentPassword")}
                />
                <FormMessage<ChangePasswordFormValues> name="currentPassword" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="newPassword">รหัสผ่านใหม่</FormLabel>
                <PasswordInput
                  autoComplete="new-password"
                  id="newPassword"
                  {...registerField(form, "newPassword")}
                />
                <FormMessage<ChangePasswordFormValues> name="newPassword" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="confirmPassword">
                  ยืนยันรหัสผ่านใหม่
                </FormLabel>
                <PasswordInput
                  autoComplete="new-password"
                  id="confirmPassword"
                  {...registerField(form, "confirmPassword")}
                />
                <FormMessage<ChangePasswordFormValues> name="confirmPassword" />
              </FormItem>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {!isForcedChange ? (
                  <NavButton icon={ArrowLeft} to="/profile" variant="outline">
                    กลับโปรไฟล์
                  </NavButton>
                ) : null}
                <Button
                  isLoading={changePassword.isPending}
                  loadingText="กำลังเปลี่ยนรหัสผ่าน"
                  type="submit"
                >
                  บันทึกรหัสผ่านใหม่
                </Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
