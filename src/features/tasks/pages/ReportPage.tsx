import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, FormErrorAlert } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  PAGE_MAX_WIDTH_CLASS,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import { deleteVisitReportDraft } from "../lib/visit-report-draft";
import { TaskIdentityVerificationGate } from "../components/TaskIdentityVerificationGate";
import { AssistanceReportPage } from "./AssistanceReportPage";
import { HomeVisitReportPage } from "./HomeVisitReportPage";

/**
 * Resolves a task link and hands it to the form that belongs to its type.
 *
 * Nothing else lives here on purpose. When this file was also the home-visit
 * form, choosing the assistance form was a conditional return *after* every
 * home-visit hook had already run — including the draft autosave, which then
 * wrote empty home-visit values over the assistance draft stored under the same
 * token. A wrapper that renders one form or the other means the hooks of the
 * form you are not on never execute at all.
 */
export function ReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const [sessionToken, setSessionToken] = useState(() =>
    readMagicToken(token, "local"),
  );

  const taskQuery = useQuery({
    queryKey: ["report-task", token, sessionToken],
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
      void deleteVisitReportDraft(token).catch(() => undefined);
      void navigate(`/task/${token}/completed`, { replace: true });
    }
  }, [navigate, taskQuery.error, token]);

  useEffect(() => {
    if (taskQuery.data?.status === "COMPLETED") {
      void deleteVisitReportDraft(token).catch(() => undefined);
      void navigate(`/task/${token}/completed`, { replace: true });
    }
  }, [navigate, taskQuery.data?.status, token]);

  if (taskQuery.isLoading) {
    return (
      <GuestPageShell contentClassName={PAGE_MAX_WIDTH_CLASS}>
        <Card className="rounded-lg p-6">
          <SkeletonStack lines={8} />
        </Card>
      </GuestPageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <GuestPageShell contentClassName="max-w-[760px]">
        <Card className="rounded-lg p-6">
          <FormErrorAlert
            error={taskQuery.error}
            fallback="ไม่สามารถโหลดแบบฟอร์มติดตามได้"
          />
        </Card>
      </GuestPageShell>
    );
  }

  const task = taskQuery.data;
  if (task.auth_required) {
    return (
      <TaskIdentityVerificationGate
        token={token}
        onVerified={setSessionToken}
      />
    );
  }

  // An assistance round reports what help was given, not a home visit, so it
  // gets its own form rather than a mode flag threaded through one.
  if (task.task_type === "ASSIST") {
    return (
      <AssistanceReportPage
        sessionToken={sessionToken}
        task={task}
        token={token}
      />
    );
  }

  return (
    <HomeVisitReportPage
      sessionToken={sessionToken}
      task={task}
      token={token}
    />
  );
}
