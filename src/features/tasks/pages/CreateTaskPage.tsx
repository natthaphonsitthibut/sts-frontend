import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, FilePlus2, Link2, MapPin, QrCode, UserRoundCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "../../../components/base";
import {
  ChoiceCardButton,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { taskService } from "../api/task.service";
import { loginLinksService } from "../../login-links/api/login-links.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import type { DataScope } from "../../auth/lib/permissions";
import { buildLineShareUrl, copyText, formatDateTime } from "../lib/task-presentation";
import {
  TASK_DURATION_UNIT_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../lib/task-options";
import type { TaskCreatePayload, TaskCreateResponse, TaskType } from "../types/task.types";

const initialForm = {
  assigned_to_email: "",
  assigned_to_name: "",
  expires_unit: "days",
  expires_value: 7,
  reason_flagged: "",
  role: "",
  student_address: "",
  student_lat: "",
  student_lng: "",
  student_name: "",
  student_school: "",
  subject: "",
};

export function CreateTaskPage() {
  const [type, setType] = useState<TaskType | "">("");
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<TaskCreateResponse | null>(null);
  const rolesQuery = useQuery({
    queryKey: ["task-create-roles"],
    queryFn: loginLinksService.getRoleOptions,
    enabled: type === "LOGIN",
  });
  // Same school → grade → room cascade as the check-in page.
  const scope = useScopeCascade();
  // LOGIN links can carry custom permissions / data scope (same editor as the
  // login-links feature) so this page is the single full create-link flow.
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState<DataScope>({});

  const createTask = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: setResult,
    throwOnError: false,
  });

  function updateField(key: keyof typeof initialForm, value: string | number): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(): void {
    if (!type) return;
    const payload: TaskCreatePayload = {
      task_type: type,
      type,
      assigned_to_name: form.assigned_to_name.trim(),
      assigned_to_email: form.assigned_to_email.trim() || null,
      expires_value: Number(form.expires_value) || 1,
      expires_unit: form.expires_unit as TaskCreatePayload["expires_unit"],
    };

    if (type === "VISIT") {
      Object.assign(payload, {
        student_name: form.student_name.trim(),
        student_school: form.student_school.trim() || null,
        student_address: form.student_address.trim() || null,
        student_lat: form.student_lat ? Number(form.student_lat) : null,
        student_lng: form.student_lng ? Number(form.student_lng) : null,
        reason_flagged: form.reason_flagged.trim() || null,
      });
    }

    if (type === "ATTENDANCE") {
      Object.assign(payload, {
        subject: form.subject.trim(),
        target_grade: scope.grade,
        target_room: scope.room,
        target_school_id: scope.schoolId ? Number(scope.schoolId) : null,
      });
    }

    if (type === "LOGIN") {
      Object.assign(payload, {
        data_scope: dataScope,
        permissions: customizePermissions ? permissions : [],
        role: form.role || null,
      });
    }

    createTask.mutate(payload);
  }

  if (result) {
    return (
      <PageShell>
        <Card>
          <CardHeader>
            <CardTitle>สร้างลิงก์สำเร็จ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="success">
              <AlertTitle>Magic link พร้อมใช้งาน</AlertTitle>
              <AlertDescription>
                หมดอายุ {formatDateTime(result.expires_at)}
              </AlertDescription>
            </Alert>
            <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
              {result.magic_link}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                icon={Copy}
                onClick={() => copyText(result.magic_link)}
                variant="outline"
              >
                คัดลอกลิงก์
              </Button>
              <a
                className={buttonVariants({ variant: "outline" })}
                href={buildLineShareUrl(result.magic_link)}
                rel="noreferrer"
                target="_blank"
              >
                แชร์ผ่าน LINE
              </a>
              <Button onClick={() => setResult(null)}>สร้างรายการใหม่</Button>
            </div>
            {result.qr_code_data ? (
              <div className="rounded-lg border border-slate-200 p-4 text-center">
                <QrCode className="mx-auto mb-3 size-6 text-slate-500" />
                <img alt="QR Code" className="mx-auto size-48" src={result.qr_code_data} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        icon={FilePlus2}
        title="สร้างลิงก์"
        description="เลือกประเภทและกรอกข้อมูลที่จำเป็น"
      />
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {TASK_TYPE_OPTIONS.map(({ value, label, description }) => {
            const Icon =
              value === "VISIT"
                ? MapPin
                : value === "ATTENDANCE"
                  ? UserRoundCheck
                  : Link2;
            return (
              <ChoiceCardButton
                description={description}
                icon={Icon}
                key={value}
                onClick={() => setType(value as TaskType)}
                selected={type === value}
                title={label}
              />
            );
          })}
        </div>

        {type ? (
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {createTask.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>สร้างลิงก์ไม่สำเร็จ กรุณาตรวจสอบข้อมูล</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  ผู้รับมอบหมาย
                  <Input
                    value={form.assigned_to_name}
                    onChange={(event) => updateField("assigned_to_name", event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  อีเมล
                  <Input
                    type="email"
                    value={form.assigned_to_email}
                    onChange={(event) => updateField("assigned_to_email", event.target.value)}
                  />
                </label>
              </div>

              {type === "VISIT" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    ชื่อนักเรียน
                    <Input value={form.student_name} onChange={(event) => updateField("student_name", event.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    โรงเรียน
                    <Input value={form.student_school} onChange={(event) => updateField("student_school", event.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-medium sm:col-span-2">
                    ที่อยู่
                    <Input value={form.student_address} onChange={(event) => updateField("student_address", event.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-medium sm:col-span-2">
                    สาเหตุ
                    <Input value={form.reason_flagged} onChange={(event) => updateField("reason_flagged", event.target.value)} />
                  </label>
                </div>
              ) : null}

              {type === "ATTENDANCE" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    โรงเรียน
                    <Select
                      value={scope.schoolId}
                      onChange={(event) => scope.setSchoolId(event.target.value)}
                    >
                      <option value="">เลือกโรงเรียน</option>
                      {scope.schools.map((school) => (
                        <option key={school.id} value={String(school.id)}>
                          {school.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    ระดับชั้น
                    <Select
                      disabled={!scope.schoolId}
                      value={scope.grade}
                      onChange={(event) => scope.setGrade(event.target.value)}
                    >
                      <option value="">
                        {scope.schoolId ? "เลือกชั้น" : "เลือกโรงเรียนก่อน"}
                      </option>
                      {scope.gradeLevels.map((grade) => (
                        <option key={grade.id} value={grade.label}>
                          {grade.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    ห้อง
                    <Select
                      disabled={!scope.grade}
                      value={scope.room}
                      onChange={(event) => scope.setRoom(event.target.value)}
                    >
                      <option value="">
                        {scope.grade ? "เลือกห้อง" : "เลือกชั้นก่อน"}
                      </option>
                      {scope.rooms.map((room) => (
                        <option key={room} value={room}>
                          ห้อง {room}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    วิชา
                    <Input value={form.subject} onChange={(event) => updateField("subject", event.target.value)} />
                  </label>
                </div>
              ) : null}

              {type === "LOGIN" ? (
                <>
                  <label className="block space-y-2 text-sm font-medium">
                    ตำแหน่ง
                    <Select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
                      <option value="">เลือก role</option>
                      {(rolesQuery.data ?? []).map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <PermissionScopeEditor
                    customizePermissions={customizePermissions}
                    dataScope={dataScope}
                    disabled={createTask.isPending}
                    onCustomizePermissionsChange={setCustomizePermissions}
                    onDataScopeChange={setDataScope}
                    onPermissionsChange={setPermissions}
                    permissions={permissions}
                    role={form.role}
                  />
                </>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <label className="space-y-2 text-sm font-medium">
                  อายุลิงก์
                  <Input
                    min={1}
                    type="number"
                    value={form.expires_value}
                    onChange={(event) => updateField("expires_value", Number(event.target.value))}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  หน่วย
                  <Select value={form.expires_unit} onChange={(event) => updateField("expires_unit", event.target.value)}>
                    {TASK_DURATION_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="flex justify-end">
                <Button
                  isLoading={createTask.isPending}
                  loadingText="กำลังสร้าง"
                  onClick={submit}
                  size="lg"
                >
                  สร้างลิงก์
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
