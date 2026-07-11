import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useApplyFieldFollower, useUploadFollowerIdCardPhoto } from "../hooks/useFieldFollowers";
import { usePublicFollowerRecruitmentCampaign } from "../hooks/useFollowerRecruitmentCampaigns";

const applicationSchema = z
  .object({
    first_name: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    last_name: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
    phone: requiredThaiPhone,
    email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
    gender: z.string().trim(),
    verification_method: z.enum(["THAID", "ID_CARD_PHOTO"]),
    thaid_person_ref: z.string().trim(),
    id_card_photo_filename: z.string().trim(),
    province: z.string().trim(),
    district: z.string().trim(),
    sub_district: z.string().trim(),
    // Honeypot — left blank by real users, never shown; a filled value silently
    // no-ops the submit on the backend without giving the bot any signal.
    website: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.verification_method === "THAID" && !values.thaid_person_ref) {
      ctx.addIssue({
        code: "custom",
        path: ["thaid_person_ref"],
        message: "กรุณายืนยันตัวตนด้วย ThaID mock",
      });
    }
    if (values.verification_method === "ID_CARD_PHOTO" && !values.id_card_photo_filename) {
      ctx.addIssue({
        code: "custom",
        path: ["id_card_photo_filename"],
        message: "กรุณาอัปโหลดรูปบัตร",
      });
    }
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
      email: "",
      gender: "",
      verification_method: "THAID",
      thaid_person_ref: "",
      id_card_photo_filename: "",
      province: "",
      district: "",
      sub_district: "",
      website: "",
    },
    resolver: zodResolver(applicationSchema),
  });

  const apply = useApplyFieldFollower();
  const uploadIdCard = useUploadFollowerIdCardPhoto();
  const verificationMethod = useWatch({ control: form.control, name: "verification_method" });
  const uploadedFilename = useWatch({ control: form.control, name: "id_card_photo_filename" });

  function onSubmit(values: ApplicationFormValues): void {
    apply.mutate(
      {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        gender: values.gender.trim() || undefined,
        verification_method: values.verification_method,
        thaid_person_ref:
          values.verification_method === "THAID" ? values.thaid_person_ref.trim() : undefined,
        id_card_photo_filename:
          values.verification_method === "ID_CARD_PHOTO"
            ? values.id_card_photo_filename.trim()
            : undefined,
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
                <FormLabel htmlFor="follower-email" required>
                  อีเมล
                </FormLabel>
                <Input id="follower-email" type="email" {...registerField(form, "email")} />
                <FormMessage<ApplicationFormValues> name="email" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="follower-gender">เพศ</FormLabel>
                <Input id="follower-gender" {...registerField(form, "gender")} />
                <FormMessage<ApplicationFormValues> name="gender" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="follower-verification-method" required>
                  วิธียืนยันตัวตน
                </FormLabel>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  id="follower-verification-method"
                  {...registerField(form, "verification_method")}
                >
                  <option value="THAID">ThaID mock</option>
                  <option value="ID_CARD_PHOTO">อัปโหลดรูปบัตร</option>
                </select>
                <FormMessage<ApplicationFormValues> name="verification_method" />
              </FormItem>

              {verificationMethod === "THAID" ? (
                <FormItem>
                  <FormLabel htmlFor="follower-thaid-ref" required>
                    รหัสอ้างอิง ThaID mock
                  </FormLabel>
                  <Input
                    id="follower-thaid-ref"
                    placeholder="เช่น เลขอ้างอิงจาก mock ThaID"
                    {...registerField(form, "thaid_person_ref")}
                  />
                  <FormMessage<ApplicationFormValues> name="thaid_person_ref" />
                </FormItem>
              ) : (
                <FormItem>
                  <FormLabel htmlFor="follower-id-card-photo" required>
                    รูปบัตรยืนยันตัวตน
                  </FormLabel>
                  <Input
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={uploadIdCard.isPending}
                    id="follower-id-card-photo"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      uploadIdCard.mutate(file, {
                        onSuccess: (result) => {
                          form.setValue("id_card_photo_filename", result.data.filename, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        },
                      });
                    }}
                    type="file"
                  />
                  <p className="min-h-5 text-sm text-slate-500">
                    {uploadIdCard.isPending
                      ? "กำลังอัปโหลด"
                      : uploadedFilename
                        ? "อัปโหลดแล้ว"
                        : "ใช้เพื่อยืนยันตัวตนเท่านั้น"}
                  </p>
                  <FormMessage<ApplicationFormValues> name="id_card_photo_filename" />
                </FormItem>
              )}

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
                disabled={uploadIdCard.isPending}
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
