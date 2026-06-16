import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { cn } from "../../../lib/utils";
import { taskService } from "../api/task.service";
import { loginLinksService } from "../../login-links/api/login-links.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { PermissionScopeEditor } from "../../auth/components/PermissionScopeEditor";
import { StudentPicker, type SelectedStudent } from "../components/StudentPicker";
import { studentsService } from "../../students/api/students.service";
import { ROLE_BASELINES, ROLE_LABELS, type DataScope } from "../../auth/lib/permissions";
import { getScopeValidationError } from "../../auth/lib/scope-validation";
import { buildTaskResultLink, formatDateTime } from "../lib/task-presentation";
import {
  TASK_DURATION_UNIT_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../lib/task-options";
import type { TaskCreatePayload, TaskCreateResponse, TaskType } from "../types/task.types";

const EMPTY_PERMISSIONS: string[] = [];

/** URL slug ↔ task type, so each link type is its own route (/create/:type). */
const PATH_TO_TYPE: Record<string, TaskType> = {
  visit: "VISIT",
  attendance: "ATTENDANCE",
  login: "LOGIN",
};
const TYPE_TO_PATH: Record<TaskType, string> = {
  VISIT: "visit",
  ATTENDANCE: "attendance",
  LOGIN: "login",
};

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

/** Pre-fill passed from the case dashboard's "สร้างลิงก์" action (a flagged student). */
interface VisitPrefill {
  existing_case_id?: string;
  student_id?: string | null;
  student_name?: string | null;
  student_school?: string | null;
  student_address?: string | null;
  reason_flagged?: string | null;
}

function makeDefaults(type: TaskType): CreateTaskFormValues {
  return {
    task_type: type,
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
}

/**
 * The actual create form for one task type. Mounted with `key={type}` so it
 * starts fresh whenever the type (route) changes — no manual state syncing.
 */
function CreateTaskTypeForm({ type }: { type: TaskType }) {
  const [result, setResult] = useState<TaskCreateResponse | null>(null);
  const location = useLocation();
  const prefill =
    type === "VISIT"
      ? ((location.state as { prefill?: VisitPrefill } | null)?.prefill ?? null)
      : null;
  const rolesQuery = useQuery({
    queryKey: ["task-create-roles"],
    queryFn: loginLinksService.getRoleOptions,
    enabled: type === "LOGIN",
  });
  // Same school → grade → room cascade as the check-in page, locked to the
  // creator's own scope so every link type stays inside their allowed area.
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter(scope.schools);
  const [dataScope, setDataScope] = useState<DataScope>({});
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(
    prefill?.student_name
      ? {
          personId: prefill.student_id ?? null,
          name: prefill.student_name,
          school: prefill.student_school ?? "",
        }
      : null,
  );

  const form = useForm<CreateTaskFormValues>({
    defaultValues: {
      ...makeDefaults(type),
      student_name: prefill?.student_name ?? "",
      student_school: prefill?.student_school ?? "",
      student_address: prefill?.student_address ?? "",
      reason_flagged: prefill?.reason_flagged ?? "",
    },
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
    type === "ATTENDANCE"
      ? !scope.schoolId
        ? "กรุณาเลือกโรงเรียน"
        : !scope.grade
          ? "กรุณาเลือกระดับชั้น"
          : !scope.room
            ? "กรุณาเลือกห้อง"
            : null
      : null;
  const submitBlockError = scopeError ?? locationError;

  const createTask = useMutation({
    mutationFn: (payload: TaskCreatePayload) => taskService.createTask(payload),
    onSuccess: setResult,
    throwOnError: false,
  });

  function startNewTask(): void {
    setResult(null);
    form.reset(makeDefaults(type));
    setDataScope({});
    setSelectedStudent(null);
    setPermissions([]);
    scope.reset();
  }

  function handleStudentChange(next: SelectedStudent | null): void {
    setSelectedStudent(next);
    form.setValue("student_name", next?.name ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue("student_school", next?.school ?? "");
    if (next?.personId) {
      void prefillStudentAddress(next.personId);
    }
  }

  // Pull the student's stored home address so the visit form prefills it. The
  // address stays editable (in case the student moved before the record is
  // updated). Replaces the old "current location" button, which captured the
  // creator's GPS — not the student's home.
  async function prefillStudentAddress(personId: string): Promise<void> {
    try {
      const detail = await studentsService.getStudentById(personId);
      const address = typeof detail.address === "string" ? detail.address : "";
      if (address) {
        form.setValue("student_address", address);
      }
    } catch {
      // leave the address field as-is (editable)
    }
  }

  function handleValid(values: CreateTaskFormValues): void {
    if (submitBlockError) {
      document
        .getElementById("create-task-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        student_lat: null,
        student_lng: null,
        reason_flagged: values.reason_flagged || null,
        existing_case_id: prefill?.existing_case_id ?? null,
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
    const publicLink = buildTaskResultLink(result.magic_link, type === "LOGIN");
    return (
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
          <LinkShareActions link={publicLink} />
          <div className="flex flex-wrap gap-2">
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
    );
  }

  return (
    <Form form={form} onSubmit={handleValid}>
      <Card id="create-task-detail">
        <CardHeader>
          <CardTitle>รายละเอียด</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormErrorAlert
            error={createTask.error}
            fallback="สร้างลิงก์ไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="assigned_to_name" required>
                ผู้รับมอบหมาย
              </FormLabel>
              <Input id="assigned_to_name" {...registerField(form, "assigned_to_name")} />
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
                <FormLabel htmlFor="student_address">ที่อยู่บ้านนักเรียน</FormLabel>
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

            </div>
          ) : null}

          {type === "ATTENDANCE" ? (
            <div className="space-y-4">
              {scope.schoolLocked ? null : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormItem>
                    <FormLabel>จังหวัด</FormLabel>
                    <Combobox
                      disabled={createTask.isPending}
                      onChange={(next) => {
                        area.setProvince(next);
                        scope.setSchoolId("");
                      }}
                      options={[
                        { value: "", label: "ทุกจังหวัด" },
                        ...area.provinces.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาจังหวัด"
                      value={area.province}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>อำเภอ</FormLabel>
                    <Combobox
                      disabled={createTask.isPending || !area.province}
                      onChange={(next) => {
                        area.setDistrict(next);
                        scope.setSchoolId("");
                      }}
                      options={[
                        { value: "", label: "ทุกอำเภอ" },
                        ...area.districts.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาอำเภอ"
                      value={area.district}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>ตำบล</FormLabel>
                    <Combobox
                      disabled={createTask.isPending || !area.district}
                      onChange={(next) => {
                        area.setSubDistrict(next);
                        scope.setSchoolId("");
                      }}
                      options={[
                        { value: "", label: "ทุกตำบล" },
                        ...area.subDistricts.map((name) => ({ value: name, label: name })),
                      ]}
                      placeholder="ค้นหาตำบล"
                      value={area.subDistrict}
                    />
                  </FormItem>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel required>โรงเรียน</FormLabel>
                  <Combobox
                    aria-invalid={
                      !scope.schoolId && form.formState.isSubmitted ? true : undefined
                    }
                    disabled={scope.schoolLocked}
                    onChange={(next) => scope.setSchoolId(next)}
                    options={[
                      { value: "", label: "เลือกโรงเรียน" },
                      ...area.filteredSchools.map((school) => ({
                        value: String(school.id),
                        label: school.name,
                      })),
                    ]}
                    placeholder="ค้นหาโรงเรียน"
                    value={scope.schoolId}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required>ระดับชั้น</FormLabel>
                  <Combobox
                    aria-invalid={
                      Boolean(scope.schoolId) && !scope.grade && form.formState.isSubmitted
                        ? true
                        : undefined
                    }
                    disabled={!scope.schoolId || scope.gradeLocked}
                    onChange={(next) => scope.setGrade(next)}
                    options={[
                      { value: "", label: "เลือกชั้น" },
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
                  <FormLabel required>ห้อง</FormLabel>
                  <Combobox
                    aria-invalid={
                      Boolean(scope.grade) && !scope.room && form.formState.isSubmitted
                        ? true
                        : undefined
                    }
                    disabled={!scope.grade || scope.roomLocked}
                    onChange={(next) => scope.setRoom(next)}
                    options={[
                      { value: "", label: "เลือกห้อง" },
                      ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
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
              <p
                className={cn(
                  "min-h-5 text-sm font-medium text-red-600",
                  !(locationError && form.formState.isSubmitted) && "invisible",
                )}
              >
                {locationError && form.formState.isSubmitted ? locationError : "."}
              </p>
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
                showErrors={form.formState.isSubmitted}
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
                  form.setValue("expires_unit", next as CreateTaskFormValues["expires_unit"], {
                    shouldValidate: form.formState.isSubmitted,
                  })
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

          <div className="flex justify-end">
            <Button
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
  );
}

export function CreateTaskPage() {
  const { type: typeParam } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const activeType = typeParam ? PATH_TO_TYPE[typeParam.toLowerCase()] : undefined;

  function chooseType(next: TaskType): void {
    // Clicking the already-selected type again deselects it (back to chooser).
    void navigate(activeType === next ? "/create" : `/create/${TYPE_TO_PATH[next]}`);
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
                onClick={() => chooseType(value as TaskType)}
                selected={activeType === value}
                title={label}
              />
            );
          })}
        </div>

        {activeType ? <CreateTaskTypeForm key={activeType} type={activeType} /> : null}
      </div>
    </PageShell>
  );
}
