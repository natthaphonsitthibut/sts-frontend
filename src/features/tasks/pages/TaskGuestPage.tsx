import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardCheck, MapPin, Save } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  useConfirm,
} from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { getAttendanceSaveConfirm } from "../../attendance/lib/attendance-save-confirm";
import { taskService } from "../api/task.service";
import { getTaskTypeLabel } from "../lib/task-presentation";
import { AttendanceStudentTable } from "../../attendance/components/AttendanceStudentTable";
import { VisitMapPreview } from "../components/VisitMapPreview";
import type {
  AttendanceTaskStatus,
  TaskGuestStudent,
} from "../types/task.types";
import { AttendanceCountBadges } from "../../attendance/components/AttendanceCountBadges";
import { countAttendanceStatuses } from "../../attendance/lib/attendance-presentation";
import { usePublicAttendanceStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { ObservationEntryDialog } from "../../student-observations/components/ObservationEntryDialog";
import { TaskLinkObservationEntryPanel } from "../../student-observations/components/ObservationEntryPanel";

const DAY_LABELS: Record<number, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

export function TaskGuestPage() {
  const attendanceStatusCatalog = usePublicAttendanceStatusCatalog();
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [sessionToken, setSessionToken] = useState(() =>
    readMagicToken(token, "local"),
  );
  const [selections, setSelections] = useState<
    Record<string, AttendanceTaskStatus>
  >({});
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [observationStudent, setObservationStudent] = useState<TaskGuestStudent | null>(null);

  const taskQuery = useQuery({
    queryKey: ["guest-task", token, sessionToken],
    queryFn: () => taskService.getTask(token, sessionToken || undefined),
    enabled: Boolean(token),
    retry: false,
  });
  const studentsQuery = useQuery({
    queryKey: ["guest-task-students", token],
    queryFn: () => taskService.getTaskStudents(token),
    enabled:
      taskQuery.data?.type === "ATTENDANCE" && !taskQuery.data?.auth_required,
  });
  const submitAttendance = useMutation({
    mutationFn: (students: TaskGuestStudent[]) =>
      taskService.submitTaskAttendance(
        token,
        students.map((student) => ({
          student_id: student.id,
          status: selections[student.id] || "P_PRESENT",
        })),
        selectedSlotId,
        sessionToken || undefined,
      ),
    onSuccess: () => {
      void navigate(`/task/${token}/success`, { replace: true });
    },
  });

  useEffect(() => {
    const status = taskQuery.error as {
      response?: { status?: number; data?: { status?: string } };
    };
    if (
      status?.response?.status === 410 ||
      status?.response?.data?.status === "EXPIRED"
    ) {
      void navigate(`/task/${token}/expired`, { replace: true });
    }
  }, [navigate, taskQuery.error, token]);

  const counts = useMemo(
    () =>
      countAttendanceStatuses(
        (studentsQuery.data ?? []).map((student) => selections[student.id] || "P_PRESENT"),
      ),
    [selections, studentsQuery.data],
  );

  if (taskQuery.isLoading) {
    return (
      <GuestPageShell>
        <Card className="rounded-lg p-6">
          <SkeletonStack lines={5} />
        </Card>
      </GuestPageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <GuestPageShell>
        <Alert variant="destructive">
          <AlertDescription>ไม่สามารถโหลดภารกิจจากลิงก์นี้ได้</AlertDescription>
        </Alert>
      </GuestPageShell>
    );
  }

  const task = taskQuery.data;
  const students = studentsQuery.data ?? [];
  const timetableSlots = task.timetable_slots ?? [];

  async function handleSubmitAttendance(): Promise<void> {
    if (!students.length || submitAttendance.isPending) {
      return;
    }
    if (timetableSlots.length > 0 && selectedSlotId === null) {
      return;
    }

    const confirmed = await confirm(getAttendanceSaveConfirm(counts));
    if (!confirmed) {
      return;
    }

    submitAttendance.mutate(students);
  }

  // Identity gate — same centred card as the login link, so every magic link
  // verifies the same way. Once OTP passes, the session refetches the task and
  // the real content (below) renders.
  if (task.auth_required) {
    return (
      <MagicAuthCard
        title="ยืนยันตัวตน"
        subtitle={task.assigned_to_name || getTaskTypeLabel(task.type)}
      >
        <OtpVerifyPanel
          onRequestOtp={() => taskService.requestTaskOtp(token)}
          onVerifyOtp={async (otp) => {
            const response = await taskService.verifyTaskOtp(token, otp);
            if (!response.session_token) {
              throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
            }
            writeMagicToken(token, response.session_token, "local");
            setSessionToken(response.session_token);
          }}
        />
      </MagicAuthCard>
    );
  }

  if (task.type === "VISIT") {
    return <Navigate replace to={`/task/${token}/report`} />;
  }

  return (
    <GuestPageShell contentClassName="space-y-5">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle as="h1" className="flex items-center gap-2">
            {task.type === "VISIT" ? (
              <MapPin className="size-5 text-primary" />
            ) : (
              <ClipboardCheck className="size-5 text-primary" />
            )}
            {getTaskTypeLabel(task.type)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-slate-500">
            ผู้รับมอบหมาย: {task.assigned_to_name || "-"}
          </div>
          {task.type === "ATTENDANCE" ? (
            <div className="font-bold text-slate-900">
              {task.school_name || "-"} · {task.target_grade || "-"} /{" "}
              {task.target_room || "-"}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-bold text-slate-900">
                {task.student_name || "-"}
              </div>
              <div className="text-sm text-slate-600">
                {task.student_address || "-"}
              </div>
              <div className="text-sm text-danger-700">
                {task.reason_flagged || "-"}
              </div>
              <VisitMapPreview
                address={task.student_address}
                emptyDescription="ยังไม่มีพิกัดบ้านที่ยืนยันสำหรับภารกิจนี้"
                lat={task.student_lat}
                lng={task.student_lng}
                markerLabel="บ้านนักเรียน"
                title="แผนที่บ้านนักเรียน"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {task.type === "ATTENDANCE" ? (
        <Card className="rounded-lg p-6">
          <div className="mb-4 space-y-4">
            {timetableSlots.length > 0 ? (
              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-slate-700"
                  htmlFor="task-slot"
                >
                  คาบที่จะเช็คชื่อ
                </label>
                <Combobox
                  id="task-slot"
                  onChange={(value) =>
                    setSelectedSlotId(value ? Number(value) : null)
                  }
                  options={[
                    { value: "", label: "เลือกคาบ" },
                    ...timetableSlots.map((slot) => ({
                      value: String(slot.id),
                      label: `วัน${DAY_LABELS[slot.day_of_week] ?? slot.day_of_week} · คาบ ${slot.period}${slot.teacher_name ? ` · ${slot.teacher_name}` : ""}`,
                    })),
                  ]}
                  placeholder="เลือกคาบ"
                  value={selectedSlotId === null ? "" : String(selectedSlotId)}
                />
                <p className="text-sm text-slate-500">
                  ลิงก์นี้เช็คชื่อได้เฉพาะคาบที่ผู้สร้างลิงก์กำหนดไว้
                </p>
              </div>
            ) : null}
            <AttendanceCountBadges
              catalog={attendanceStatusCatalog.data ?? []}
              counts={counts}
            />
          </div>
          {studentsQuery.isLoading ? (
            <SkeletonStack lines={4} className="py-2" />
          ) : (
            <div className="space-y-3">
              <AttendanceStudentTable
                onObserveStudent={
                  // Hidden until a period is picked — the backend requires the
                  // observation to belong to one of the link's periods.
                  timetableSlots.length === 0 || selectedSlotId !== null
                    ? setObservationStudent
                    : undefined
                }
                onStatusChange={(studentId, status) =>
                  setSelections((current) => ({
                    ...current,
                    [studentId]: status as AttendanceTaskStatus,
                  }))
                }
                selections={selections}
                students={students}
              />
              <Button
                fullWidth
                disabled={timetableSlots.length > 0 && selectedSlotId === null}
                icon={Save}
                isLoading={submitAttendance.isPending}
                loadingText="กำลังบันทึก"
                onClick={() => void handleSubmitAttendance()}
                size="lg"
              >
                บันทึกข้อมูล
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      {task.type === "VISIT" ? (
        <div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className={buttonVariants({ fullWidth: true, size: "lg" })}
              to={`/task/${token}/report`}
            >
              ลงพื้นที่และส่งรายงาน
            </Link>
            {task.can_delegate ? (
              <Link
                className={buttonVariants({
                  fullWidth: true,
                  size: "lg",
                  variant: "outline",
                })}
                to={`/task/${token}/delegate`}
              >
                มอบหมายให้ผู้อื่น
              </Link>
            ) : null}
          </div>
          {task.can_delegate ? (
            <p className="text-center text-xs leading-relaxed text-slate-500">
              มอบหมายภารกิจนี้ให้ผู้อื่นดำเนินการแทน — คุณจะไม่ใช่ผู้รับผิดชอบหลักของภารกิจนี้อีกต่อไป
            </p>
          ) : null}
        </div>
      ) : null}
      {confirmDialog}
      <ObservationEntryDialog
        open={observationStudent !== null}
        title="บันทึกข้อสังเกตจากลิงก์เช็คชื่อ"
        onClose={() => setObservationStudent(null)}
      >
        {observationStudent ? (
          <TaskLinkObservationEntryPanel
            token={token}
            sessionToken={sessionToken || undefined}
            studentTermId={observationStudent.id}
            studentName={observationStudent.name}
            timetableSlotId={selectedSlotId ?? undefined}
          />
        ) : null}
      </ObservationEntryDialog>
    </GuestPageShell>
  );
}
