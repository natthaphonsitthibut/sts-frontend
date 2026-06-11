import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, MapPin } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import { VISIT_CAUSE_CATEGORY_OPTIONS } from "../lib/task-options";

export function ReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [causeCategory, setCauseCategory] = useState("");
  const [causeDetail, setCauseDetail] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const taskQuery = useQuery({
    queryKey: ["report-task", token],
    queryFn: () => taskService.getTask(token, readMagicToken(token, "local") || undefined),
    enabled: Boolean(token),
  });

  const submitReport = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.set("cause_category", causeCategory);
      formData.set("cause_detail", causeDetail);
      formData.set("recommendation", recommendation);
      formData.set("visit_lat", lat);
      formData.set("visit_lng", lng);
      photos.slice(0, 5).forEach((photo) => formData.append("photos", photo));
      return taskService.submitTaskReport(token, formData, readMagicToken(token, "local"));
    },
    onSuccess: () => {
      void navigate(`/task/${token}/success`, { replace: true });
    },
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
          <CardContent className="space-y-4">
            {submitReport.isError ? (
              <Alert variant="destructive">
                <AlertDescription>ส่งรายงานไม่สำเร็จ กรุณาตรวจสอบข้อมูล</AlertDescription>
              </Alert>
            ) : null}
            <label className="block space-y-2 text-sm font-medium">
              ประเภทสาเหตุ
              <Select
                onChange={(event) => setCauseCategory(event.target.value)}
                value={causeCategory}
              >
                <option value="">เลือกประเภท</option>
                {VISIT_CAUSE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              รายละเอียด
              <Textarea
                className="min-h-28"
                onChange={(event) => setCauseDetail(event.target.value)}
                value={causeDetail}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              ข้อเสนอแนะ
              <Textarea
                onChange={(event) => setRecommendation(event.target.value)}
                value={recommendation}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium">
                Latitude
                <Input onChange={(event) => setLat(event.target.value)} value={lat} />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Longitude
                <Input onChange={(event) => setLng(event.target.value)} value={lng} />
              </label>
            </div>
            <div className="space-y-2">
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => setPhotos(Array.from(event.target.files || []).slice(0, 5))}
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
              disabled={!causeCategory}
              fullWidth
              isLoading={submitReport.isPending}
              loadingText="กำลังส่งรายงาน"
              onClick={() => submitReport.mutate()}
            >
              บันทึกและส่งรายงาน
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
