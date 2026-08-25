import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
} from "../../../components/base";

const developmentGoogleEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมลครู")
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .max(254, "อีเมลยาวเกินไป"),
});

type DevelopmentGoogleEmailValues = z.infer<
  typeof developmentGoogleEmailSchema
>;

interface DevelopmentGoogleEmailFormProps {
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (email: string) => void | Promise<void>;
  submitLabel?: string;
}

export function DevelopmentGoogleEmailForm({
  isSubmitting,
  onBack,
  onSubmit,
  submitLabel = "เข้าใช้งานด้วยอีเมลนี้",
}: DevelopmentGoogleEmailFormProps) {
  const form = useForm<DevelopmentGoogleEmailValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(developmentGoogleEmailSchema),
  });

  return (
    <div data-development-google-form>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          เลือกครูสำหรับทดสอบใน local
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          กรอกอีเมลของครูที่มีอยู่ในข้อมูล local
          ระบบจะตรวจสิทธิ์กับโรงเรียนและลิงก์นี้ก่อนเข้าใช้งาน
        </p>
      </div>
      <Form
        form={form}
        onSubmit={({ email }) => onSubmit(email.trim().toLowerCase())}
      >
        <FormItem>
          <FormLabel htmlFor="development-google-email" required>
            อีเมลครู
          </FormLabel>
          <Input
            autoComplete="email"
            autoFocus
            id="development-google-email"
            placeholder="teacher@example.com"
            type="email"
            {...registerField(form, "email")}
          />
          <FormMessage<DevelopmentGoogleEmailValues> name="email" />
        </FormItem>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={isSubmitting}
            onClick={onBack}
            type="button"
            variant="outline"
          >
            ย้อนกลับ
          </Button>
          <Button
            isLoading={isSubmitting}
            loadingText="กำลังตรวจสอบอีเมล"
            type="submit"
          >
            {submitLabel}
          </Button>
        </div>
      </Form>
    </div>
  );
}
