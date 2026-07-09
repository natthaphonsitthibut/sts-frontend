import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
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
  Skeleton,
} from "../../../components/base";
import { requiredThaiPhone } from "../../../lib/validation";
import { useApplyFieldFollower } from "../hooks/useFieldFollowers";
import { usePublicFollowerRecruitmentCampaign } from "../hooks/useFollowerRecruitmentCampaigns";

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

function ApplicationCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[560px]">
        <Card className="rounded-lg">{children}</Card>
      </div>
    </div>
  );
}

export function FieldFollowerApplicationPage() {
  const { code = "" } = useParams<{ code: string }>();
  const campaignQuery = usePublicFollowerRecruitmentCampaign(code);
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
        campaign_code: code,
        website: values.website,
      },
      { onSuccess: () => setSubmitted(true) },
    );
  }

  if (campaignQuery.isLoading) {
    return (
      <ApplicationCardShell>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </ApplicationCardShell>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <ApplicationCardShell>
        <CardHeader>
          <CardTitle>ไม่พบลิงก์รับสมัคร</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              ลิงก์นี้ไม่ถูกต้องหรือถูกลบไปแล้ว กรุณาติดต่อผู้ที่แชร์ลิงก์นี้ให้คุณเพื่อขอลิงก์ใหม่
            </AlertDescription>
          </Alert>
        </CardContent>
      </ApplicationCardShell>
    );
  }

  if (!campaignQuery.data.is_open) {
    return (
      <ApplicationCardShell>
        <CardHeader>
          <CardTitle>{campaignQuery.data.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertDescription>
              ขณะนี้ปิดรับสมัครแล้ว กรุณาติดต่อผู้ที่แชร์ลิงก์นี้ให้คุณสำหรับข้อมูลเพิ่มเติม
            </AlertDescription>
          </Alert>
        </CardContent>
      </ApplicationCardShell>
    );
  }

  return (
    <ApplicationCardShell>
      <CardHeader>
        <CardTitle>สมัคร อสม./ผู้ติดตามภาคสนาม</CardTitle>
        <p className="text-sm text-slate-500">{campaignQuery.data.name}</p>
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
    </ApplicationCardShell>
  );
}
