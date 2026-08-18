import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  useApproveTeacherAccessAraIdChallenge,
  useBeginTeacherAccessAraIdChallenge,
} from "../../teacher-access/hooks/useTeacherAccess";
import { taskService } from "../../tasks/api/task.service";
import { authService } from "../../auth/api/auth.service";
import { AraIdWordmark } from "../components/AraIdWordmark";
import { useAraIdSession } from "../hooks/useAraId";

function readChallengeToken(): string {
  const token =
    new URLSearchParams(window.location.hash.slice(1))
      .get("challenge")
      ?.trim() ?? "";
  return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
}

/**
 * Which flow the QR belongs to. Older teacher-link QR codes carry no scope, so
 * the absent value has to keep meaning `teacher-access`.
 */
type AraIdChallengeScope = "teacher-access" | "task-link" | "admin-login";

function readChallengeScope(): AraIdChallengeScope {
  const scope = new URLSearchParams(window.location.hash.slice(1))
    .get("scope")
    ?.trim();
  return scope === "task-link" || scope === "admin-login"
    ? scope
    : "teacher-access";
}

export function AraIdAuthorizePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as {
    challengeToken?: string;
    araIdPinVerified?: boolean;
    scope?: AraIdChallengeScope;
  } | null;
  const [challengeToken] = useState(
    () => routeState?.challengeToken ?? readChallengeToken(),
  );
  const [scope] = useState<AraIdChallengeScope>(
    () => routeState?.scope ?? readChallengeScope(),
  );
  const [completed, setCompleted] = useState(false);
  const attempted = useRef(false);
  const session = useAraIdSession();
  const teacherAccessBegin = useBeginTeacherAccessAraIdChallenge();
  const teacherAccessApprove = useApproveTeacherAccessAraIdChallenge();
  // These run on mount to resolve a challenge, so the global mutation toast
  // would announce "บันทึกแล้ว" for what is only a lookup, exactly like the
  // teacher-access hooks that already opt out.
  const taskBegin = useMutation({
    mutationFn: (token: string) => taskService.beginTaskAraIdChallenge(token),
    meta: { suppressSuccessToast: true },
  });
  const taskApprove = useMutation({
    mutationFn: () => taskService.approveTaskAraIdChallenge(),
    meta: { suppressSuccessToast: true },
  });
  const adminLoginBegin = useMutation({
    mutationFn: (token: string) => authService.beginAraIdLoginChallenge(token),
    meta: { suppressSuccessToast: true },
  });
  const adminLoginApprove = useMutation({
    mutationFn: authService.approveAraIdLoginChallenge,
    meta: { suppressSuccessToast: true },
  });
  const begin =
    scope === "task-link"
      ? taskBegin
      : scope === "admin-login"
        ? adminLoginBegin
        : teacherAccessBegin;
  const approve =
    scope === "task-link"
      ? taskApprove
      : scope === "admin-login"
        ? adminLoginApprove
        : teacherAccessApprove;

  useEffect(() => {
    if (!challengeToken || session.isPending || attempted.current) return;
    if (begin.isIdle) {
      begin.mutate(challengeToken);
      return;
    }
    if (begin.isPending || begin.isError) return;
    if (session.isError) {
      attempted.current = true;
      void navigate("/araid/login", {
        replace: true,
        state: {
          challengeToken,
          scope,
          returnTo: "/araid/authorize",
          verificationIntent: "TEACHER_ACCESS_QR",
        },
      });
      return;
    }
    if (!routeState?.araIdPinVerified) {
      attempted.current = true;
      void navigate("/araid/pin", {
        replace: true,
        state: {
          challengeToken,
          scope,
          returnTo: "/araid/authorize",
          verificationIntent: "TEACHER_ACCESS_QR",
          reauthenticate: true,
        },
      });
      return;
    }
    attempted.current = true;
    void approve
      .mutateAsync()
      .then(() => setCompleted(true))
      .catch(() => undefined);
  }, [
    approve,
    begin,
    challengeToken,
    navigate,
    routeState?.araIdPinVerified,
    session.isError,
    session.isPending,
    scope,
  ]);

  return (
    <main className="grid min-h-dvh place-items-center bg-araid-brand px-5 py-10 font-araid">
      <section className="araid-screen-enter w-full max-w-md rounded-3xl bg-white px-6 py-10 text-center shadow-2xl sm:px-10">
        <AraIdWordmark className="text-3xl text-araid-brand-deep drop-shadow-none" />
        {!challengeToken ? (
          <Alert className="mt-8" variant="warning">
            <AlertDescription>
              ลิงก์ยืนยันไม่ครบถ้วน กรุณาสแกน QR หรือเปิดลิงก์ใหม่อีกครั้ง
            </AlertDescription>
          </Alert>
        ) : completed ? (
          <div className="mt-8 flex flex-col items-center">
            <CheckCircle2 className="size-16 text-success" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-araid-brand-deep">
              ยืนยันสำเร็จ
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              กลับไปยังหน้าที่แสดง QR ได้เลย ระบบจะเข้าสู่ระบบให้อัตโนมัติ
            </p>
          </div>
        ) : begin.isError || approve.isError ? (
          <div className="mt-8">
            <ShieldCheck
              className="mx-auto size-14 text-danger"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-bold text-araid-brand-deep">
              ยืนยันไม่สำเร็จ
            </h1>
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(
                  begin.error ?? approve.error,
                  "คำขอยืนยันหมดอายุหรือข้อมูลไม่ตรงกัน",
                )}
              </AlertDescription>
            </Alert>
            <Button
              className="mt-5"
              fullWidth
              onClick={() => window.location.reload()}
            >
              ลองอีกครั้ง
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <LoaderCircle
              className="size-12 animate-spin text-araid-action motion-reduce:animate-none"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-bold text-araid-brand-deep">
              กำลังยืนยันตัวตน
            </h1>
            <p className="mt-2 text-sm text-slate-600">กรุณารอสักครู่</p>
          </div>
        )}
      </section>
    </main>
  );
}
