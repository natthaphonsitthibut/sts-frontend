import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Camera, LocateFixed, MapPin } from "lucide-react";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
  Textarea,
  useConfirm,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import { VisitMapPreview } from "../components/VisitMapPreview";
import { VISIT_CAUSE_CATEGORY_OPTIONS } from "../lib/task-options";

const reportSchema = z.object({
  causeCategory: z.string().trim().min(1, "กรุณาเลือกประเภทสาเหตุ"),
  causeDetail: z.string().trim(),
  recommendation: z.string().trim(),
});

type ReportFormValues = z.infer<typeof reportSchema>;
type Coordinates = { lat: number; lng: number };
type CoordinateValue = number | string | null | undefined;

const HOME_CORRECTION_WARNING_DISTANCE_METERS = 150;
const EARTH_RADIUS_METERS = 6_371_000;

function normalizeCoordinate(value: CoordinateValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCoordinates(lat: CoordinateValue, lng: CoordinateValue): Coordinates | null {
  const parsedLat = normalizeCoordinate(lat);
  const parsedLng = normalizeCoordinate(lng);
  return parsedLat !== null && parsedLng !== null ? { lat: parsedLat, lng: parsedLng } : null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from: Coordinates, to: Coordinates): number {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} กม.`;
  }
  return `${Math.round(meters)} ม.`;
}

export function ReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [homeCorrection, setHomeCorrection] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [homeCorrectionConfirmed, setHomeCorrectionConfirmed] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
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
  const currentHomeCoordinates = normalizeCoordinates(
    taskQuery.data?.student_lat,
    taskQuery.data?.student_lng,
  );
  const homeCorrectionDistanceMeters =
    homeCorrection && currentHomeCoordinates
      ? getDistanceMeters(currentHomeCoordinates, homeCorrection)
      : null;
  const isLargeHomeCorrection =
    homeCorrectionDistanceMeters !== null &&
    homeCorrectionDistanceMeters > HOME_CORRECTION_WARNING_DISTANCE_METERS;

  function updateHomeCorrection(next: Coordinates | null): void {
    setHomeCorrection(next);
    setHomeCorrectionConfirmed(false);
  }

  const submitReport = useMutation({
    mutationFn: (values: ReportFormValues) => {
      const formData = new FormData();
      formData.set("cause_category", values.causeCategory);
      formData.set("cause_detail", values.causeDetail);
      formData.set("recommendation", values.recommendation);
      formData.set("visit_lat", lat);
      formData.set("visit_lng", lng);
      if (homeCorrection) {
        formData.set("address_changed", "true");
        formData.set("updated_lat", String(homeCorrection.lat));
        formData.set("updated_lng", String(homeCorrection.lng));
      }
      photos.slice(0, 5).forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(token, formData, readMagicToken(token, "local"));
    },
    onSuccess: () => {
      void navigate(`/task/${token}/success`, { replace: true });
    },
    throwOnError: false,
  });

  async function handleSubmitReport(values: ReportFormValues): Promise<void> {
    if (submitReport.isPending) {
      return;
    }

    if (homeCorrection && !homeCorrectionConfirmed) {
      const confirmed = await confirm({
        cancelText: "กลับไปตรวจสอบ",
        confirmText: "ยืนยันและส่งรายงาน",
        description: (
          <>
            {currentHomeCoordinates && homeCorrectionDistanceMeters !== null ? (
              <>
                พิกัดใหม่ห่างจากพิกัดบ้านเดิมประมาณ{" "}
                <strong>{formatDistance(homeCorrectionDistanceMeters)}</strong>
                {isLargeHomeCorrection ? " ซึ่งเกินเกณฑ์ 150 เมตร" : ""}
              </>
            ) : (
              <>ภารกิจนี้ยังไม่มีพิกัดบ้านเดิม ระบบจะเสนอพิกัดนี้เป็นตำแหน่งบ้านครั้งแรก</>
            )}
            <br />
            กรุณายืนยันเฉพาะเมื่อมั่นใจว่าพิกัดนี้เป็นบ้านนักเรียนจริง
          </>
        ),
        title: isLargeHomeCorrection
          ? "ยืนยันพิกัดบ้านใหม่ที่ห่างจากเดิมมาก"
          : "ยืนยันการเสนอแก้พิกัดบ้าน",
        variant: isLargeHomeCorrection ? "destructive" : "default",
      });
      if (!confirmed) {
        return;
      }
      setHomeCorrectionConfirmed(true);
    }

    submitReport.mutate(values);
  }

  function handleUseCurrentLocation(): void {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setLocationStatus("idle");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }

  function handleUseVisitAsHome(): void {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
      updateHomeCorrection({ lat: parsedLat, lng: parsedLng });
    }
  }

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
              <div className="space-y-3">
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="font-bold text-slate-900">{taskQuery.data.student_name || "-"}</div>
                  <div>{taskQuery.data.student_school || "-"}</div>
                  <div>{taskQuery.data.student_address || "-"}</div>
                </div>
                <VisitMapPreview
                  address={taskQuery.data.student_address}
                  emptyDescription="ยังไม่มีพิกัดบ้านที่ยืนยันสำหรับภารกิจนี้"
                  lat={taskQuery.data.student_lat}
                  lng={taskQuery.data.student_lng}
                  markerLabel="บ้านนักเรียน"
                  title="แผนที่บ้านนักเรียน"
                />
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
            <Form form={form} onSubmit={handleSubmitReport}>
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={LocateFixed}
                    isLoading={locationStatus === "loading"}
                    loadingText="กำลังอ่านตำแหน่ง"
                    onClick={handleUseCurrentLocation}
                    type="button"
                    variant="outline"
                  >
                    ใช้ตำแหน่งปัจจุบัน
                  </Button>
                  <Button
                    disabled={!lat || !lng}
                    icon={MapPin}
                    onClick={handleUseVisitAsHome}
                    type="button"
                    variant="ghost"
                  >
                    เสนอพิกัดนี้เป็นพิกัดบ้าน
                  </Button>
                </div>
                {locationStatus === "error" ? (
                  <p className="text-sm font-medium text-danger-700">
                    ไม่สามารถอ่านตำแหน่งจากอุปกรณ์ได้ กรุณาอนุญาต GPS หรือกรอกพิกัดเอง
                  </p>
                ) : null}

                <VisitMapPreview
                  editable
                  emptyDescription="อนุญาตตำแหน่งจากอุปกรณ์ หรือกรอกพิกัดเพื่อแสดงหมุดหน้างาน"
                  lat={lat}
                  lng={lng}
                  markerLabel="หน้างาน"
                  onCoordinateChange={(next) => {
                    setLat(String(next.lat));
                    setLng(String(next.lng));
                  }}
                  title="แผนที่พิกัดหน้างาน"
                />

                {homeCorrection ? (
                  <div className="space-y-3">
                    <VisitMapPreview
                      address={taskQuery.data?.student_address}
                      editable
                      lat={homeCorrection.lat}
                      lng={homeCorrection.lng}
                      markerLabel="พิกัดบ้านใหม่"
                      onCoordinateChange={updateHomeCorrection}
                      title="พิกัดบ้านที่จะอัปเดต"
                    />
                    <Alert variant={isLargeHomeCorrection ? "warning" : "default"}>
                      <AlertTitle>
                        {currentHomeCoordinates
                          ? "ยืนยันก่อนเสนอแก้พิกัดบ้าน"
                          : "ยืนยันการตั้งพิกัดบ้านครั้งแรก"}
                      </AlertTitle>
                      <AlertDescription>
                        {currentHomeCoordinates && homeCorrectionDistanceMeters !== null ? (
                          <>
                            พิกัดใหม่นี้ห่างจากพิกัดบ้านเดิมประมาณ{" "}
                            <strong>{formatDistance(homeCorrectionDistanceMeters)}</strong>
                            {isLargeHomeCorrection
                              ? " เกินเกณฑ์ 150 เมตร กรุณาตรวจสอบหมุดบนแผนที่ก่อนส่งรายงาน"
                              : " อยู่ในระยะที่ไม่เกินเกณฑ์แจ้งเตือน"}
                          </>
                        ) : (
                          "ภารกิจนี้ยังไม่มีพิกัดบ้านเดิม ระบบจะเสนอพิกัดนี้เป็นพิกัดบ้านครั้งแรก"
                        )}
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Checkbox
                        checked={homeCorrectionConfirmed}
                        label="ยืนยันว่าพิกัดนี้เป็นตำแหน่งบ้านนักเรียนที่ต้องการเสนอให้อัปเดต"
                        onChange={(event) => setHomeCorrectionConfirmed(event.target.checked)}
                      />
                      <Button
                        onClick={() => updateHomeCorrection(null)}
                        type="button"
                        variant="ghost"
                      >
                        ยกเลิกการอัปเดตพิกัดบ้าน
                      </Button>
                    </div>
                  </div>
                ) : null}

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
        {confirmDialog}
      </div>
    </div>
  );
}
