import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Camera, MapPin } from "lucide-react";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
  Textarea,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import { VISIT_CAUSE_CATEGORY_OPTIONS } from "../lib/task-options";

const reportSchema = z.object({
  causeCategory: z.string().trim().min(1, "กรุณาเลือกประเภทสาเหตุ"),
  causeDetail: z.string().trim(),
  recommendation: z.string().trim(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function ReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const form = useForm<ReportFormValues>({
    defaultValues: { causeCategory: "", causeDetail: "", recommendation: "" },
    resolver: zodResolver(reportSchema),
  });
  const causeCategory = useWatch({ control: form.control, name: "causeCategory" });

  const taskQuery = useQuery({
    queryKey: ["report-task", token],
    queryFn: () => taskService.getTask(token, readMagicToken(token, "local") || undefined),
    enabled: Boolean(token),
  });

  const submitReport = useMutation({
    mutationFn: (values: ReportFormValues) => {
      const formData = new FormData();
      formData.set("cause_category", values.causeCategory);
      formData.set("cause_detail", values.causeDetail);
      formData.set("recommendation", values.recommendation);
      formData.set("visit_lat", lat);
      formData.set("visit_lng", lng);
      photos.slice(0, 5).forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(token, formData, readMagicToken(token, "local"));
    },
    onSuccess: () => {
      void navigate(`/task/${token}/success`, { replace: true });
    },
    throwOnError: false,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setLat(String(position.coords.latitude));
      setLng(String(position.coords.longitude));
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>รายงานการลงพื้นที่</CardTitle>
          </CardHeader>
          <CardContent>
            {taskQuery.isLoading ? (
              <SkeletonStack lines={3} />
            ) : taskQuery.data ? (
              <div className="space-y-1 text-sm text-slate-600">
                <div className="font-bold text-slate-900">{taskQuery.data.student_name || "-"}</div>
                <div>{taskQuery.data.student_school || "-"}</div>
                <div>{taskQuery.data.student_address || "-"}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              ข้อมูลหน้างาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form form={form} onSubmit={(values) => submitReport.mutate(values)}>
              <div className="space-y-4">
                <FormErrorAlert
                  error={submitReport.error}
                  fallback="ส่งรายงานไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                />

                <FormItem>
                  <FormLabel htmlFor="cause-category" required>
                    ประเภทสาเหตุ
                  </FormLabel>
                  <Combobox
                    aria-invalid={form.formState.errors.causeCategory ? true : undefined}
                    id="cause-category"
                    name="causeCategory"
                    onChange={(next) =>
                      form.setValue("causeCategory", next, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    options={[
                      { value: "", label: "เลือกประเภท" },
                      ...VISIT_CAUSE_CATEGORY_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                    searchable={false}
                    value={causeCategory}
                  />
                  <FormMessage<ReportFormValues> name="causeCategory" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="cause-detail">รายละเอียด</FormLabel>
                  <Textarea
                    className="min-h-28"
                    id="cause-detail"
                    {...registerField(form, "causeDetail")}
                  />
                  <FormMessage<ReportFormValues> name="causeDetail" />
                </FormItem>

                <FormItem>
                  <FormLabel htmlFor="recommendation">ข้อเสนอแนะ</FormLabel>
                  <Textarea id="recommendation" {...registerField(form, "recommendation")} />
                  <FormMessage<ReportFormValues> name="recommendation" />
                </FormItem>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="visit-lat">Latitude</FormLabel>
                    <Input
                      id="visit-lat"
                      onChange={(event) => setLat(event.target.value)}
                      value={lat}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="visit-lng">Longitude</FormLabel>
                    <Input
                      id="visit-lng"
                      onChange={(event) => setLng(event.target.value)}
                      value={lng}
                    />
                  </FormItem>
                </div>

                <div className="space-y-2">
                  <input
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(event) =>
                      setPhotos(Array.from(event.target.files || []).slice(0, 5))
                    }
                    ref={fileInputRef}
                    type="file"
                  />
                  <Button
                    icon={Camera}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    variant="outline"
                  >
                    เลือกรูปภาพ ({photos.length}/5)
                  </Button>
                </div>

                <Button
                  fullWidth
                  isLoading={submitReport.isPending}
                  loadingText="กำลังส่งรายงาน"
                  type="submit"
                >
                  บันทึกและส่งรายงาน
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
