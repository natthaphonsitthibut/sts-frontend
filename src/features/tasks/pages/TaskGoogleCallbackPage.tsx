import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { TASK_GOOGLE_PENDING_KEY } from "../lib/task-google-login";

interface PendingTaskGoogleLogin {
  token: string;
  returnTo: string;
}

function readPending(): PendingTaskGoogleLogin | null {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(TASK_GOOGLE_PENDING_KEY) ?? "null",
    ) as Partial<PendingTaskGoogleLogin> | null;
    if (!value || !/^[A-Za-z0-9_-]{32,256}$/.test(value.token ?? ""))
      return null;
    const taskPrefix = `/task/${value.token}`;
    if (
      typeof value.returnTo !== "string" ||
      !value.returnTo.startsWith(taskPrefix)
    ) {
      return {
        token: value.token,
        returnTo: taskPrefix,
      } as PendingTaskGoogleLogin;
    }
    return value as PendingTaskGoogleLogin;
  } catch {
    return null;
  }
}

export function TaskGoogleCallbackPage() {
  const navigate = useNavigate();
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const pending = readPending();
  const params = new URLSearchParams(window.location.hash.slice(1));
  const sessionToken = params.get("sessionToken")?.trim() ?? "";
  const failed =
    Boolean(params.get("error")) ||
    sessionToken.length < 20 ||
    sessionToken.length > 2048;

  useEffect(() => {
    if (!pending || failed) return;
    window.sessionStorage.removeItem(TASK_GOOGLE_PENDING_KEY);
    writeMagicToken(pending.token, sessionToken, "local");
    void navigate(pending.returnTo, { replace: true });
  }, [failed, navigate, pending, sessionToken, writeMagicToken]);

  if (!pending || failed) {
    return (
      <MagicAuthCard showProfile={false} title="Google Login ไม่สำเร็จ">
        <Alert variant="warning">
          <AlertDescription>
            ไม่สามารถยืนยันบัญชีครูในโรงเรียนของลิงก์นี้ได้
            กรุณากลับไปเปิดลิงก์งานและลองใหม่
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle="กำลังกลับไปยังลิงก์งาน…"
      title="ยืนยัน Google แล้ว"
    >
      <div
        aria-hidden="true"
        className="h-11 animate-pulse rounded-lg bg-slate-100"
      />
    </MagicAuthCard>
  );
}
