import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  Input,
  NumericInput,
  registerField,
} from "../../../components/base";
import { requiredThaiPhone } from "../../../lib/validation";
import { useApplyFieldFollower } from "../hooks/useFieldFollowers";

const applicationSchema = z.object({
  first_name: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  last_name: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  phone: requiredThaiPhone,
  province: z.string().trim(),
  district: z.string().trim(),
  sub_district: z.string().trim(),
  // Honeypot — left blank by real users, never shown; a filled value silently
  // no-ops the submit on the backend without giving the bot any signal.
  website: z.string(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export function FieldFollowerApplicationPage() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ApplicationFormValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      province: "",
      district: "",
      sub_district: "",
      website: "",
    },
    resolver: zodResolver(applicationSchema),
  });

  const apply = useApplyFieldFollower();

  function onSubmit(values: ApplicationFormValues): void {
    apply.mutate(
      {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone.trim(),
        province: values.province.trim() || undefined,
        district: values.district.trim() || undefined,
        sub_district: values.sub_district.trim() || undefined,
        website: values.website,
      },
      { onSuccess: () => setSubmitted(true) },
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[560px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>สมัคร อสม./ผู้ติดตามภาคสนาม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <Alert variant="success">
                <AlertDescription>
                  ส่งใบสมัครสำเร็จ เจ้าหน้าที่จะตรวจสอบและติดต่อกลับทางเบอร์โทรศัพท์ที่แจ้งไว้
                </AlertDescription>
              </Alert>
            ) : (
              <Form form={form} onSubmit={onSubmit}>
                <div className="space-y-4">
                  <FormErrorAlert
                    error={apply.error}
                    fallback="ส่งใบสมัครไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                  />

                  <FormItem>
                    <FormLabel htmlFor="follower-first-name" required>
                      ชื่อ
                    </FormLabel>
                    <Input id="follower-first-name" {...registerField(form, "first_name")} />
                    <FormMessage<ApplicationFormValues> name="first_name" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="follower-last-name" required>
                      นามสกุล
                    </FormLabel>
                    <Input id="follower-last-name" {...registerField(form, "last_name")} />
                    <FormMessage<ApplicationFormValues> name="last_name" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="follower-phone" required>
                      เบอร์โทรศัพท์
                    </FormLabel>
                    <NumericInput
                      id="follower-phone"
                      maxLength={10}
                      {...registerField(form, "phone")}
                    />
                    <FormMessage<ApplicationFormValues> name="phone" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="follower-province">จังหวัด</FormLabel>
                    <Input id="follower-province" {...registerField(form, "province")} />
                    <FormMessage<ApplicationFormValues> name="province" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="follower-district">อำเภอ/เขต</FormLabel>
                    <Input id="follower-district" {...registerField(form, "district")} />
                    <FormMessage<ApplicationFormValues> name="district" />
                  </FormItem>

                  <FormItem>
                    <FormLabel htmlFor="follower-sub-district">ตำบล/แขวง</FormLabel>
                    <Input id="follower-sub-district" {...registerField(form, "sub_district")} />
                    <FormMessage<ApplicationFormValues> name="sub_district" />
                  </FormItem>

                  {/* Honeypot: hidden from real users, off-screen (not display:none) so
                      screen readers skip it too but form-filling bots still see and fill it. */}
                  <div aria-hidden="true" className="absolute left-[-9999px] top-auto">
                    <label htmlFor="follower-website">เว็บไซต์</label>
                    <input
                      autoComplete="off"
                      id="follower-website"
                      tabIndex={-1}
                      type="text"
                      {...registerField(form, "website")}
                    />
                  </div>

                  <Button
                    isLoading={apply.isPending}
                    loadingText="กำลังส่งใบสมัคร"
                    type="submit"
                  >
                    ส่งใบสมัคร
                  </Button>
                </div>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
