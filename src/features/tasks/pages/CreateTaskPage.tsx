import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { FilePlus2, Link2, MapPin, Plus, UserRoundCheck } from "lucide-react";
import { z } from "zod";
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
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  registerField,
} from "../../../components/base";
import {
  ChoiceCardButton,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { CopyButton } from "../../../components/layout/copy-button";
import { cn } from "../../../lib/utils";
import { taskService } from "../api/task.service";
import { loginLinksService } from "../../login-links/api/login-links.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import { StudentPicker, type SelectedStudent } from "../components/StudentPicker";
import { ROLE_BASELINES, ROLE_LABELS, type DataScope } from "../../auth/lib/permissions";
import { getScopeValidationError } from "../../auth/lib/scope-validation";
import { buildLineShareUrl, formatDateTime } from "../lib/task-presentation";
import {
  TASK_DURATION_UNIT_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../lib/task-options";
import type { TaskCreatePayload, TaskCreateResponse, TaskType } from "../types/task.types";

const EMPTY_PERMISSIONS: string[] = [];

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function isEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}

const createTaskSchema = z
  .object({
    task_type: z.enum(["VISIT", "ATTENDANCE", "LOGIN"]),
    assigned_to_name: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับมอบหมาย"),
    assigned_to_email: z.string().trim(),
    role: z.string().trim(),
    student_name: z.string().trim(),
    student_school: z.string().trim(),
    student_address: z.string().trim(),
    reason_flagged: z.string().trim(),
    subject: z.string().trim(),
    expires_value: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
        "อายุลิงก์ต้องเป็นจำนวนเต็มมากกว่า 0",
      ),
    expires_unit: z.string().min(1),
  })
  .superRefine((values, ctx) => {
    // Every link type needs a contactable assignee email.
    if (!values.assigned_to_email) {
      ctx.addIssue({
        code: "custom",
        path: ["assigned_to_email"],
        message: "กรุณากรอกอีเมลผู้รับมอบหมาย",
      });
    } else if (!isEmail(values.assigned_to_email)) {
      ctx.addIssue({
        code: "custom",
        path: ["assigned_to_email"],
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }
    if (values.task_type === "LOGIN" && !values.role) {
      ctx.addIssue({ code: "custom", path: ["role"], message: "กรุณาเลือกตำแหน่ง" });
    }
    if (values.task_type === "VISIT") {
      if (!values.student_name) {
        ctx.addIssue({
          code: "custom",
          path: ["student_name"],
          message: "กรุณาเลือกหรือกรอกชื่อนักเรียน",
        });
      }
      if (!values.reason_flagged) {
        ctx.addIssue({
          code: "custom",
          path: ["reason_flagged"],
          message: "กรุณากรอกเหตุผล",
        });
      }
    }
    if (values.task_type === "ATTENDANCE" && !values.subject) {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "กรุณากรอกวิชา" });
    }
  });

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

const DEFAULT_VALUES: CreateTaskFormValues = {
  task_type: "VISIT",
  assigned_to_name: "",
  assigned_to_email: "",
  role: "",
  student_name: "",
  student_school: "",
  student_address: "",
  reason_flagged: "",
  subject: "",
  expires_value: "7",
  expires_unit: "days",
};

export function CreateTaskPage() {
  const [type, setType] = useState<TaskType | "">("");
  const [result, setResult] = useState<TaskCreateResponse | null>(null);
  const rolesQuery = useQuery({
    queryKey: ["task-create-roles"],
    queryFn: loginLinksService.getRoleOptions,
    enabled: type === "LOGIN",
  });
  // Same school → grade → room cascade as the check-in page, locked to the
  // creator's own scope so every link type stays inside their allowed area.
  const scope = useScopeCascade({ lockToActorScope: true });
  // LOGIN links can carry custom permissions / data scope (same editor as the
  // login-links feature) so this page is the single full create-link flow.
  const [dataScope, setDataScope] = useState<DataScope>({});
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [visitLat, setVisitLat] = useState("");
  const [visitLng, setVisitLng] = useState("");

  const form = useForm<CreateTaskFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(createTaskSchema),
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  const expiresUnit = useWatch({ control: form.control, name: "expires_unit" });

  const selectedRoleOption = (rolesQuery.data ?? []).find(
    (role) => role.name === selectedRole,
  );
  const baseline = selectedRoleOption?.default_permissions?.length
    ? selectedRoleOption.default_permissions
    : ROLE_BASELINES[selectedRole] ?? EMPTY_PERMISSIONS;
  const roleLabel = selectedRoleOption?.label ?? ROLE_LABELS[selectedRole] ?? selectedRole;
  const scopeMode = selectedRoleOption?.scope_mode ?? "flexible";
  const [permissions, setPermissions] = useState<string[]>(baseline);
  const isCustomized = !sameSet(permissions, baseline);

  // Load the selected role's standard permissions whenever the role changes.
  const [trackedRole, setTrackedRole] = useState(selectedRole);
  if (selectedRole !== trackedRole) {
    setTrackedRole(selectedRole);
    setPermissions(baseline);
  }

  const scopeError =
    type === "LOGIN" ? getScopeValidationError(scopeMode, dataScope, roleLabel) : null;
  // ATTENDANCE must target at least a school, otherwise there is no roster to check.
  const locationError =
    type === "ATTENDANCE" && !scope.schoolId ? "กรุณาเลือกโรงเรียนที่จะเช็คชื่อ" : null;
  const submitBlockError = scopeError ?? locationError;

  const createTask = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: setResult,
    throwOnError: false,
  });

  function selectType(next: TaskType): void {
    setType(next);
    form.setValue("task_type", next);
  }

  function startNewTask(): void {
    setResult(null);
    setType("");
    form.reset(DEFAULT_VALUES);
    setDataScope({});
    setSelectedStudent(null);
    setVisitLat("");
    setVisitLng("");
    setPermissions([]);
    scope.reset();
  }

  function handleStudentChange(next: SelectedStudent | null): void {
    setSelectedStudent(next);
    form.setValue("student_name", next?.name ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_school", next?.school ?? "");
  }

  function fillCurrentLocation(): void {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setVisitLat(String(position.coords.latitude));
      setVisitLng(String(position.coords.longitude));
    });
  }

  function handleValid(values: CreateTaskFormValues): void {
    if (!type || submitBlockError) {
      return;
    }
    const payload: TaskCreatePayload = {
      task_type: type,
      type,
      assigned_to_name: values.assigned_to_name,
      assigned_to_email: values.assigned_to_email || null,
      expires_value: Number(values.expires_value) || 1,
      expires_unit: values.expires_unit as TaskCreatePayload["expires_unit"],
    };

    if (type === "VISIT") {
      Object.assign(payload, {
        student_name: values.student_name,
        student_id: selectedStudent?.personId ?? null,
        student_school: values.student_school || null,
        student_address: values.student_address || null,
        student_lat: visitLat ? Number(visitLat) : null,
        student_lng: visitLng ? Number(visitLng) : null,
        reason_flagged: values.reason_flagged || null,
      });
    }

    if (type === "ATTENDANCE") {
      Object.assign(payload, {
        subject: values.subject,
        target_grade: scope.grade,
        target_room: scope.room,
        target_school_id: scope.schoolId ? Number(scope.schoolId) : null,
      });
    }

    if (type === "LOGIN") {
      Object.assign(payload, {
        data_scope: dataScope,
        permissions: isCustomized ? permissions : [],
        role: values.role || null,
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
              <CopyButton label="คัดลอก" size="md" value={result.magic_link} variant="outline" />
              <a
                className={buttonVariants({ variant: "outline" })}
                href={buildLineShareUrl(result.magic_link)}
                rel="noreferrer"
                target="_blank"
              >
                แชร์ผ่าน LINE
              </a>
              <Button icon={Plus} onClick={startNewTask}>
                สร้างรายการใหม่
              </Button>
            </div>
            {result.qr_code_data ? (
              <div className="rounded-lg border border-slate-200 p-4 text-center">
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
                onClick={() => selectType(value as TaskType)}
                selected={type === value}
                title={label}
              />
            );
          })}
        </div>

        {type ? (
          <Form form={form} onSubmit={handleValid}>
            <Card>
              <CardHeader>
                <CardTitle>รายละเอียด</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormErrorAlert
                  error={createTask.error}
                  fallback="สร้างลิงก์ไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
                />

                <div className="grid gap-x-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor="assigned_to_name" required>
                      ผู้รับมอบหมาย
                    </FormLabel>
                    <Input
                      id="assigned_to_name"
                      {...registerField(form, "assigned_to_name")}
                    />
                    <FormMessage<CreateTaskFormValues> name="assigned_to_name" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="assigned_to_email" required>
                      อีเมล
                    </FormLabel>
                    <Input
                      id="assigned_to_email"
                      type="email"
                      {...registerField(form, "assigned_to_email")}
                    />
                    <FormMessage<CreateTaskFormValues> name="assigned_to_email" />
                  </FormItem>
                </div>

                {type === "VISIT" ? (
                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel required>นักเรียน</FormLabel>
                      <StudentPicker
                        disabled={createTask.isPending}
                        onChange={handleStudentChange}
                        value={selectedStudent}
                      />
                      <FormMessage<CreateTaskFormValues> name="student_name" />
                    </FormItem>

                    <FormItem>
                      <FormLabel htmlFor="student_address">ที่อยู่</FormLabel>
                      <Input id="student_address" {...registerField(form, "student_address")} />
                      <FormMessage<CreateTaskFormValues> name="student_address" />
                    </FormItem>

                    <FormItem>
                      <FormLabel htmlFor="reason_flagged" required>
                        สาเหตุ
                      </FormLabel>
                      <Input id="reason_flagged" {...registerField(form, "reason_flagged")} />
                      <FormMessage<CreateTaskFormValues> name="reason_flagged" />
                    </FormItem>

                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <FormItem>
                        <FormLabel htmlFor="visit-lat">Latitude</FormLabel>
                        <Input
                          id="visit-lat"
                          inputMode="decimal"
                          onChange={(event) => setVisitLat(event.target.value)}
                          value={visitLat}
                        />
                      </FormItem>
                      <FormItem>
                        <FormLabel htmlFor="visit-lng">Longitude</FormLabel>
                        <Input
                          id="visit-lng"
                          inputMode="decimal"
                          onChange={(event) => setVisitLng(event.target.value)}
                          value={visitLng}
                        />
                      </FormItem>
                      <Button
                        icon={MapPin}
                        onClick={fillCurrentLocation}
                        type="button"
                        variant="outline"
                      >
                        ใช้ตำแหน่งปัจจุบัน
                      </Button>
                    </div>
                  </div>
                ) : null}

                {type === "ATTENDANCE" ? (
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel required>โรงเรียน</FormLabel>
                      <Combobox
                        aria-invalid={locationError ? true : undefined}
                        disabled={scope.schoolLocked}
                        onChange={(next) => scope.setSchoolId(next)}
                        options={[
                          { value: "", label: "เลือกโรงเรียน" },
                          ...scope.schools.map((school) => ({
                            value: String(school.id),
                            label: school.name,
                          })),
                        ]}
                        placeholder="ค้นหาโรงเรียน"
                        value={scope.schoolId}
                      />
                      <p
                        className={cn(
                          "min-h-5 text-sm font-medium text-red-600",
                          !locationError && "invisible",
                        )}
                      >
                        {locationError ?? "."}
                      </p>
                    </FormItem>
                    <FormItem>
                      <FormLabel>ระดับชั้น</FormLabel>
                      <Combobox
                        disabled={!scope.schoolId || scope.gradeLocked}
                        onChange={(next) => scope.setGrade(next)}
                        options={[
                          { value: "", label: "ทุกชั้น" },
                          ...scope.gradeLevels.map((grade) => ({
                            value: grade.label,
                            label: grade.label,
                          })),
                        ]}
                        placeholder="ค้นหาชั้น"
                        value={scope.grade}
                      />
                    </FormItem>
                    <FormItem>
                      <FormLabel>ห้อง</FormLabel>
                      <Combobox
                        disabled={!scope.grade || scope.roomLocked}
                        onChange={(next) => scope.setRoom(next)}
                        options={[
                          { value: "", label: "ทุกห้อง" },
                          ...scope.rooms.map((room) => ({
                            value: room,
                            label: `ห้อง ${room}`,
                          })),
                        ]}
                        placeholder="ค้นหาห้อง"
                        value={scope.room}
                      />
                    </FormItem>
                    <FormItem>
                      <FormLabel htmlFor="subject" required>
                        วิชา
                      </FormLabel>
                      <Input id="subject" {...registerField(form, "subject")} />
                      <FormMessage<CreateTaskFormValues> name="subject" />
                    </FormItem>
                  </div>
                ) : null}

                {type === "LOGIN" ? (
                  <>
                    <FormItem>
                      <FormLabel htmlFor="role" required>
                        ตำแหน่ง
                      </FormLabel>
                      <Combobox
                        aria-invalid={form.formState.errors.role ? true : undefined}
                        id="role"
                        name="role"
                        onChange={(next) =>
                          form.setValue("role", next, {
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                        options={[
                          { value: "", label: "เลือกตำแหน่ง" },
                          ...(rolesQuery.data ?? []).map((role) => ({
                            value: role.name,
                            label: role.label,
                          })),
                        ]}
                        searchable={false}
                        value={selectedRole}
                      />
                      <FormMessage<CreateTaskFormValues> name="role" />
                    </FormItem>
                    <PermissionScopeEditor
                      baselinePermissions={baseline}
                      dataScope={dataScope}
                      disabled={createTask.isPending}
                      onDataScopeChange={setDataScope}
                      onPermissionsChange={setPermissions}
                      permissions={permissions}
                      role={selectedRole}
                      roleLabel={roleLabel}
                      scopeMode={scopeMode}
                    />
                  </>
                ) : null}

                <div className="grid gap-x-4 sm:grid-cols-[1fr_160px]">
                  <FormItem>
                    <FormLabel htmlFor="expires_value" required>
                      อายุลิงก์
                    </FormLabel>
                    <NumericInput
                      id="expires_value"
                      maxLength={4}
                      {...registerField(form, "expires_value")}
                    />
                    <FormMessage<CreateTaskFormValues> name="expires_value" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="expires_unit">หน่วย</FormLabel>
                    <Combobox
                      id="expires_unit"
                      name="expires_unit"
                      onChange={(next) =>
                        form.setValue(
                          "expires_unit",
                          next as CreateTaskFormValues["expires_unit"],
                          { shouldValidate: form.formState.isSubmitted },
                        )
                      }
                      options={TASK_DURATION_UNIT_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      searchable={false}
                      value={expiresUnit}
                    />
                    <FormMessage<CreateTaskFormValues> name="expires_unit" />
                  </FormItem>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {submitBlockError ? (
                    <p className="text-sm font-medium text-red-600 sm:mr-auto">
                      ยังสร้างไม่ได้: {submitBlockError}
                    </p>
                  ) : null}
                  <Button
                    disabled={Boolean(submitBlockError)}
                    isLoading={createTask.isPending}
                    loadingText="กำลังสร้าง"
                    size="lg"
                    type="submit"
                  >
                    สร้างลิงก์
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Form>
        ) : null}
      </div>
    </PageShell>
  );
}
