import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardCheck, MapPin, Save } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useConfirm,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { getAttendanceSaveConfirm } from "../../attendance/lib/attendance-save-confirm";
import { taskService } from "../api/task.service";
import {
  getTaskTypeLabel,
} from "../lib/task-presentation";
import { AttendanceStudentTable } from "../../attendance/components/AttendanceStudentTable";
import type { AttendanceTaskStatus, TaskGuestStudent } from "../types/task.types";

export function TaskGuestPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [sessionToken, setSessionToken] = useState(() => readMagicToken(token, "local"));
  const [selections, setSelections] = useState<Record<string, AttendanceTaskStatus>>({});

  const taskQuery = useQuery({
    queryKey: ["guest-task", token, sessionToken],
    queryFn: () => taskService.getTask(token, sessionToken || undefined),
    enabled: Boolean(token),
    retry: false,
  });
  const studentsQuery = useQuery({
    queryKey: ["guest-task-students", token],
    queryFn: () => taskService.getTaskStudents(token),
    enabled: taskQuery.data?.type === "ATTENDANCE" && !taskQuery.data?.auth_required,
  });
  const submitAttendance = useMutation({
    mutationFn: (students: TaskGuestStudent[]) =>
      taskService.submitTaskAttendance(
        token,
        students.map((student) => ({
          student_id: student.id,
          status: selections[student.id] || "P_PRESENT",
        })),
      ),
    onSuccess: () => {
      void navigate(`/task/${token}/success`, { replace: true });
    },
  });

  useEffect(() => {
    const status = taskQuery.error as { response?: { status?: number; data?: { status?: string } } };
    if (status?.response?.status === 410 || status?.response?.data?.status === "EXPIRED") {
      void navigate(`/task/${token}/expired`, { replace: true });
    }
  }, [navigate, taskQuery.error, token]);

  const counts = useMemo(() => {
    const students = studentsQuery.data ?? [];
    return students.reduce(
      (acc, student) => {
        const status = selections[student.id] || "P_PRESENT";
        if (status === "P_PRESENT") acc.present += 1;
        if (status === "P_LATE") acc.late += 1;
        if (status === "P_ABSENT") acc.absent += 1;
        return acc;
      },
      { absent: 0, late: 0, present: 0 },
    );
  }, [selections, studentsQuery.data]);

  if (taskQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto w-full max-w-[960px]">
          <Card className="p-6">
            <SkeletonStack lines={5} />
          </Card>
        </div>
      </div>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <Alert variant="destructive">
          <AlertDescription>ไม่สามารถโหลดภารกิจจากลิงก์นี้ได้</AlertDescription>
        </Alert>
      </div>
    );
  }

  const task = taskQuery.data;
  const students = studentsQuery.data ?? [];

  async function handleSubmitAttendance(): Promise<void> {
    if (!students.length || submitAttendance.isPending) {
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
      <MagicAuthCard title="ยืนยันตัวตน" subtitle={task.assigned_to_name || getTaskTypeLabel(task.type)}>
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

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[960px] space-y-5">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                {task.school_name || "-"} · {task.target_grade || "-"} / {task.target_room || "-"}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="font-bold text-slate-900">{task.student_name || "-"}</div>
                <div className="text-sm text-slate-600">{task.student_address || "-"}</div>
                <div className="text-sm text-danger-700">{task.reason_flagged || "-"}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {task.type === "ATTENDANCE" ? (
          <Card className="rounded-lg p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="success">มา {counts.present}</Badge>
              <Badge variant="warning">สาย {counts.late}</Badge>
              <Badge variant="destructive">ขาด {counts.absent}</Badge>
            </div>
            {studentsQuery.isLoading ? (
              <SkeletonStack lines={4} className="py-2" />
            ) : (
              <div className="space-y-3">
                <AttendanceStudentTable
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
        ) : null}
        {confirmDialog}
      </div>
    </div>
  );
}
