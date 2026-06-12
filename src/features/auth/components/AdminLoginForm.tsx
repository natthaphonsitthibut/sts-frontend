import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  registerField,
} from "../../../components/base";
import {
  adminLoginSchema,
  type AdminLoginFormValues,
} from "../schemas/login.schema";
import {
  getLoginMutationErrorMessage,
  useAdminLogin,
} from "../hooks/useAdminLogin";

export function AdminLoginForm() {
  const loginMutation = useAdminLogin();
  const form = useForm<AdminLoginFormValues>({
    defaultValues: {
      password: "",
      username: "",
    },
    resolver: zodResolver(adminLoginSchema),
  });

  return (
    <Form form={form} onSubmit={(values) => loginMutation.mutate(values)}>
      <div className="space-y-4">
        {loginMutation.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getLoginMutationErrorMessage(loginMutation.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <FormItem>
          <FormLabel htmlFor="username">ชื่อผู้ใช้งาน</FormLabel>
          <Input
            id="username"
            placeholder="กรอกชื่อผู้ใช้งาน"
            autoComplete="username"
            {...registerField(form, "username")}
          />
          <FormMessage<AdminLoginFormValues> name="username" />
        </FormItem>

        <FormItem>
          <FormLabel htmlFor="password">รหัสผ่าน</FormLabel>
          <PasswordInput
            id="password"
            placeholder="กรอกรหัสผ่าน"
            autoComplete="current-password"
            {...registerField(form, "password")}
          />
          <div className="flex items-center justify-between gap-3">
            <FormMessage<AdminLoginFormValues> name="password" />
            <a
              className="shrink-0 text-sm font-semibold text-primary no-underline"
              href="#"
              onClick={(event) => event.preventDefault()}
            >
              ลืมรหัสผ่าน?
            </a>
          </div>
        </FormItem>

        <Button
          className="h-12 text-base font-bold"
          fullWidth
          isLoading={loginMutation.isPending}
          loadingText="กำลังเข้าสู่ระบบ"
          type="submit"
        >
          เข้าสู่ระบบ
        </Button>
      </div>
    </Form>
  );
}
