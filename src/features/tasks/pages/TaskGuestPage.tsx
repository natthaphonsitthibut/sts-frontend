import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, Card } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import { TaskOtpVerificationGate } from "../components/TaskOtpVerificationGate";

/**
 * Entry point for a magic task link. Per-classroom attendance links were retired
 * in favour of per-teacher links (teacher access grants), so the only task a link
 * can carry now is a home visit — this page resolves the token, runs the shared
 * OTP gate, and hands off to the report flow.
 */
export function TaskGuestPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const [sessionToken, setSessionToken] = useState(() =>
    readMagicToken(token, "local"),
  );

  const taskQuery = useQuery({
    queryKey: ["guest-task", token, sessionToken],
    queryFn: () => taskService.getTask(token, sessionToken || undefined),
    enabled: Boolean(token),
    retry: false,
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
    if (status?.response?.data?.status === "COMPLETED") {
      void navigate(`/task/${token}/completed`, { replace: true });
    }
  }, [navigate, taskQuery.error, token]);

  useEffect(() => {
    if (taskQuery.data?.status === "COMPLETED") {
      void navigate(`/task/${token}/completed`, { replace: true });
    }
  }, [navigate, taskQuery.data?.status, token]);

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

  // Identity gate — same centred card as the login link, so every magic link
  // verifies the same way. Once OTP passes, the session refetches the task.
  if (task.auth_required) {
    return (
      <TaskOtpVerificationGate token={token} onVerified={setSessionToken} />
    );
  }

  // Both work types file their report through the same route; the report page
  // picks the follow-up or assistance form from the task type.
  if (task.type === "VISIT" || task.type === "ASSIST") {
    return <Navigate replace to={`/task/${token}/report`} />;
  }

  return (
    <GuestPageShell>
      <Alert variant="destructive">
        <AlertDescription>
          ลิงก์นี้เป็นภารกิจประเภทที่ไม่รองรับแล้ว
          กรุณาติดต่อเจ้าหน้าที่โรงเรียนเพื่อขอลิงก์ใหม่
        </AlertDescription>
      </Alert>
    </GuestPageShell>
  );
}
