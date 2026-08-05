import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { CalendarClock, UserRoundPlus } from "lucide-react";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  Button,
  buttonVariants,
  Card,
  CardContent,
  DatePicker,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  registerField,
  Textarea,
  TimePicker,
} from "../../../components/base";
import { CopyButton } from "../../../components/layout/copy-button";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { requiredThaiPhone } from "../../../lib/validation";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import {
  buildLineShareUrl,
  formatDateTime,
  formatDateTimeRangeAge,
  normalizeTaskPublicLink,
} from "../lib/task-presentation";
import type { TaskDelegationResponse } from "../types/task.types";

const delegateSchema = z
  .object({
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับงาน"),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุลผู้รับงาน"),
    phone: requiredThaiPhone,
    email: z.string().trim().min(1, "กรุณากรอกอีเมลสำหรับยืนยัน OTP").email("รูปแบบอีเมลไม่ถูกต้อง"),
    note: z.string().trim().min(1, "กรุณากรอกรายละเอียดการมอบหมาย").max(1000),
    expiryDate: z.string().trim().min(1, "กรุณาเลือกวันที่หมดอายุ"),
    expiryTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลาหมดอายุ"),
  })
  .superRefine((values, context) => {
    const expiresAt = new Date(`${values.expiryDate}T${values.expiryTime}:00`);
    if (Number.isNaN(expiresAt.getTime())) {
      context.addIssue({
        code: "custom",
        message: "วันและเวลาหมดอายุไม่ถูกต้อง",
        path: ["expiryDate"],
      });
      return;
    }
    const remainingMs = expiresAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      context.addIssue({
        code: "custom",
        message: "วันและเวลาหมดอายุต้องอยู่ในอนาคต",
        path: ["expiryDate"],
      });
    } else if (remainingMs > 90 * 24 * 60 * 60 * 1000) {
      context.addIssue({
        code: "custom",
        message: "วันและเวลาหมดอายุต้องไม่เกิน 90 วัน",
        path: ["expiryDate"],
      });
    }
  });

type DelegateFormValues = z.infer<typeof delegateSchema>;

function getLocalDateTimeParts(date: Date): { date: string; time: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

export function DelegatePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const [result, setResult] = useState<TaskDelegationResponse | null>(null);
  const [initialExpiry] = useState(() =>
    getLocalDateTimeParts(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const form = useForm<DelegateFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      note: "",
      expiryDate: initialExpiry.date,
      expiryTime: initialExpiry.time,
    },
    resolver: zodResolver(delegateSchema),
  });
  const expiryDate = useWatch({ control: form.control, name: "expiryDate" });
  const expiryTime = useWatch({ control: form.control, name: "expiryTime" });

  const delegate = useMutation({
    mutationFn: (values: DelegateFormValues) =>
      taskService.delegateTask(
        token,
        {
          expires_at: new Date(`${values.expiryDate}T${values.expiryTime}:00`).toISOString(),
          delegation_note: values.note.trim(),
          new_assignee_email: values.email.trim(),
          new_assignee_first_name: values.firstName.trim(),
          new_assignee_last_name: values.lastName.trim(),
          new_assignee_phone: values.phone.trim(),
        },
        readMagicToken(token, "local") || undefined,
      ),
    onSuccess: setResult,
    throwOnError: false,
  });

  return (
    <GuestPageShell contentClassName="max-w-[760px]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-primary">
          <UserRoundPlus className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">มอบหมายภารกิจให้ผู้อื่น</h1>
          <p className="text-sm text-slate-500">ผู้รับงานต้องใช้อีเมลเพื่อยืนยัน OTP ก่อนเข้าถึงข้อมูล</p>
        </div>
      </div>
      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          {result ? (
            <div className="space-y-4">
              <Alert variant="success">
                <AlertDescription>
                  ส่งต่อสำเร็จ เริ่มใช้งานตอนนี้ · หมดอายุ{" "}
                  {formatDateTime(result.expires_at)} · อายุ{" "}
                  {formatDateTimeRangeAge(
                    new Date().toISOString(),
                    result.expires_at,
                  )}
                </AlertDescription>
              </Alert>
              <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                {normalizeTaskPublicLink(result.magic_link)}
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  label="คัดลอก"
                  size="md"
                  value={normalizeTaskPublicLink(result.magic_link)}
                  variant="outline"
                />
                <a
                  className={buttonVariants({ variant: "outline" })}
                  href={buildLineShareUrl(
                    normalizeTaskPublicLink(result.magic_link),
                  )}
                  rel="noreferrer"
                  target="_blank"
                >
                  แชร์ผ่าน LINE
                </a>
              </div>
              {result.qr_code_data ? (
                <img
                  alt="QR Code"
                  className="mx-auto size-48"
                  src={result.qr_code_data}
                />
              ) : null}
            </div>
          ) : (
            <Form form={form} onSubmit={(values) => delegate.mutate(values)}>
              <div className="space-y-4">
                <FormErrorAlert
                  error={delegate.error}
                  fallback="ส่งต่อภารกิจไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="delegate-first-name" required>
                      ชื่อ
                    </FormLabel>
                    <Input id="delegate-first-name" {...registerField(form, "firstName")} />
                    <FormMessage<DelegateFormValues> name="firstName" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="delegate-last-name" required>
                      นามสกุล
                    </FormLabel>
                    <Input id="delegate-last-name" {...registerField(form, "lastName")} />
                    <FormMessage<DelegateFormValues> name="lastName" />
                  </FormItem>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="delegate-phone" required>
                      เบอร์โทรศัพท์
                    </FormLabel>
                    <NumericInput
                      id="delegate-phone"
                      maxLength={10}
                      {...registerField(form, "phone")}
                    />
                    <FormMessage<DelegateFormValues> name="phone" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="delegate-email" required>
                      อีเมลผู้รับงาน
                    </FormLabel>
                    <Input
                      autoComplete="email"
                      id="delegate-email"
                      inputMode="email"
                      type="email"
                      {...registerField(form, "email")}
                    />
                    <FormMessage<DelegateFormValues> name="email" />
                  </FormItem>
                </div>

                <FormItem>
                  <FormLabel htmlFor="delegate-note" required>
                    รายละเอียดการมอบหมาย
                  </FormLabel>
                  <Textarea
                    className="min-h-24"
                    id="delegate-note"
                    maxLength={1000}
                    placeholder="ระบุสิ่งที่ต้องติดตาม ข้อมูลสำคัญ หรือคำแนะนำสำหรับผู้รับงาน"
                    {...registerField(form, "note")}
                  />
                  <FormMessage<DelegateFormValues> name="note" />
                </FormItem>

                <section className="rounded-lg border border-primary/40 bg-[#edf4ff] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CalendarClock className="size-4.5 text-primary" aria-hidden="true" />
                    วันและเวลาหมดอายุของลิงก์ใหม่
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel htmlFor="delegate-expiry-date" required>
                        วันที่หมดอายุ
                      </FormLabel>
                      <DatePicker
                        ariaLabel="วันที่หมดอายุ"
                        id="delegate-expiry-date"
                        onChange={(value) =>
                          form.setValue("expiryDate", value, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        value={expiryDate}
                      />
                      <FormMessage<DelegateFormValues> name="expiryDate" />
                    </FormItem>
                    <FormItem>
                      <FormLabel htmlFor="delegate-expiry-time" required>
                        เวลาหมดอายุ
                      </FormLabel>
                      <TimePicker
                        ariaLabel="เวลาหมดอายุ"
                        id="delegate-expiry-time"
                        onChange={(value) =>
                          form.setValue("expiryTime", value, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        value={expiryTime}
                      />
                      <FormMessage<DelegateFormValues> name="expiryTime" />
                    </FormItem>
                  </div>
                </section>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                  <Button
                    onClick={() => navigate(`/task/${token}`)}
                    type="button"
                    variant="outline"
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    isLoading={delegate.isPending}
                    loadingText="กำลังส่งต่อ"
                    type="submit"
                  >
                    ส่งต่อภารกิจ
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}
