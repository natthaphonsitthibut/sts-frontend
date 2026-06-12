import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  registerField,
} from "../../../components/base";
import { CopyButton } from "../../../components/layout/copy-button";
import { optionalThaiPhone } from "../../../lib/validation";
import { taskService } from "../api/task.service";
import { buildLineShareUrl, formatDateTime } from "../lib/task-presentation";
import type { TaskDelegationResponse } from "../types/task.types";

const delegateSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับงาน"),
  phone: optionalThaiPhone,
  hours: z
    .string()
    .trim()
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      "อายุลิงก์ต้องเป็นจำนวนเต็มมากกว่า 0",
    ),
});

type DelegateFormValues = z.infer<typeof delegateSchema>;

export function DelegatePage() {
  const { token = "" } = useParams<{ token: string }>();
  const [result, setResult] = useState<TaskDelegationResponse | null>(null);
  const form = useForm<DelegateFormValues>({
    defaultValues: { name: "", phone: "", hours: "24" },
    resolver: zodResolver(delegateSchema),
  });

  const delegate = useMutation({
    mutationFn: (values: DelegateFormValues) =>
      taskService.delegateTask(token, {
        expires_in_hours: Number(values.hours) || 1,
        new_assignee_name: values.name.trim(),
        new_assignee_phone: values.phone.trim() || null,
      }),
    onSuccess: setResult,
    throwOnError: false,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[640px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>มอบหมายภารกิจให้ผู้อื่น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <div className="space-y-4">
                <Alert variant="success">
                  <AlertDescription>
                    ส่งต่อสำเร็จ ลิงก์หมดอายุ {formatDateTime(result.expires_at)}
                  </AlertDescription>
                </Alert>
                <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
                  {result.magic_link}
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton label="คัดลอก" value={result.magic_link} variant="outline" />
                  <a
                    className={buttonVariants({ variant: "outline" })}
                    href={buildLineShareUrl(result.magic_link)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    แชร์ผ่าน LINE
                  </a>
                </div>
                {result.qr_code_data ? (
                  <img alt="QR Code" className="mx-auto size-48" src={result.qr_code_data} />
                ) : null}
              </div>
            ) : (
              <Form form={form} onSubmit={(values) => delegate.mutate(values)}>
                <div className="space-y-4">
                  <FormErrorAlert
                    error={delegate.error}
                    fallback="ส่งต่อภารกิจไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                  />

                  <FormItem>
                    <FormLabel htmlFor="delegate-name" required>
                      ชื่อผู้รับงาน
                    </FormLabel>
                    <Input id="delegate-name" {...registerField(form, "name")} />
                    <FormMessage<DelegateFormValues> name="name" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="delegate-phone">เบอร์โทรศัพท์</FormLabel>
                    <NumericInput
                      id="delegate-phone"
                      maxLength={10}
                      {...registerField(form, "phone")}
                    />
                    <FormMessage<DelegateFormValues> name="phone" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="delegate-hours" required>
                      อายุลิงก์ใหม่ (ชั่วโมง)
                    </FormLabel>
                    <NumericInput
                      id="delegate-hours"
                      maxLength={4}
                      {...registerField(form, "hours")}
                    />
                    <FormMessage<DelegateFormValues> name="hours" />
                  </FormItem>

                  <div className="flex gap-2">
                    <Button
                      isLoading={delegate.isPending}
                      loadingText="กำลังส่งต่อ"
                      type="submit"
                    >
                      ส่งต่อภารกิจ
                    </Button>
                    <Link
                      className={buttonVariants({ variant: "outline" })}
                      to={`/task/${token}`}
                    >
                      ย้อนกลับ
                    </Link>
                  </div>
                </div>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
