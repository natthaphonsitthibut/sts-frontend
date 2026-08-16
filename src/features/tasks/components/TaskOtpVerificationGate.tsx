import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "../../../components/base";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import type { TaskAraIdChallenge } from "../types/task.types";
import { TaskAraIdChallengePanel } from "./TaskAraIdChallengePanel";

interface TaskOtpVerificationGateProps {
  token: string;
  onVerified: (sessionToken: string) => void;
}

/**
 * Identity gate for every public task link — the same AraID-or-email choice the
 * teacher link offers, sharing its components.
 *
 * AraID is always offered: whether the assigned teacher actually has a citizen
 * id on file is the school's data-entry problem, so the attempt simply fails
 * with a clear message rather than the button being hidden.
 */
export function TaskOtpVerificationGate({ token, onVerified }: TaskOtpVerificationGateProps) {
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [method, setMethod] = useState<"ARAID" | "EMAIL" | null>(null);
  const [araIdChallenge, setAraIdChallenge] = useState<TaskAraIdChallenge | null>(null);

  const createAraIdChallenge = useMutation({
    mutationFn: () => taskService.createTaskAraIdChallenge(token),
  });

  function acceptSession(sessionToken: string): void {
    writeMagicToken(token, sessionToken, "local");
    onVerified(sessionToken);
  }

  if (araIdChallenge) {
    return (
      <TaskAraIdChallengePanel
        challenge={araIdChallenge}
        isRefreshing={createAraIdChallenge.isPending}
        onApproved={acceptSession}
        onBack={() => {
          setAraIdChallenge(null);
          setMethod(null);
        }}
        onExpired={() => {
          void createAraIdChallenge
            .mutateAsync()
            .then(setAraIdChallenge)
            .catch(() => undefined);
        }}
      />
    );
  }

  return (
    <MagicAuthCard
      backLabel="เปลี่ยนวิธียืนยัน"
      cardContentClassName="min-h-[23.625rem]"
      onBack={method ? () => setMethod(null) : undefined}
      showProfile={false}
      subtitle={
        maskedEmail
          ? `ระบบส่งรหัสไปที่ ${maskedEmail}`
          : "เลือกยืนยันผ่าน AraID หรือรับรหัสทางอีเมล"
      }
      title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
    >
      <div className="space-y-4">
        {createAraIdChallenge.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {createAraIdChallenge.error instanceof Error
                ? createAraIdChallenge.error.message
                : "สร้างคำขอยืนยันผ่าน AraID ไม่สำเร็จ กรุณาลองใหม่"}
            </AlertDescription>
          </Alert>
        ) : null}
        {method === null ? (
          <IdentityMethodChoice
            araIdDescription="ยืนยันด้วยเลขประจำตัวที่ผูกกับข้อมูลครู"
            disabled={createAraIdChallenge.isPending}
            emailDescription="รับรหัส OTP ที่อีเมลของผู้รับมอบหมาย"
            onChooseAraId={() => {
              setMethod("ARAID");
              void createAraIdChallenge
                .mutateAsync()
                .then(setAraIdChallenge)
                .catch(() => setMethod(null));
            }}
            onChooseEmail={() => setMethod("EMAIL")}
          />
        ) : method === "ARAID" ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-4 border-araid-action/20 border-t-araid-action motion-reduce:animate-none" />
            <p className="text-sm text-slate-600">กำลังสร้าง QR สำหรับยืนยัน…</p>
          </div>
        ) : (
          <OtpVerifyPanel
            onRequestOtp={async () => {
              const challenge = await taskService.requestTaskOtp(token);
              setMaskedEmail(challenge.maskedEmail);
            }}
            onVerifyOtp={async (otp) => {
              const response = await taskService.verifyTaskOtp(token, otp);
              if (!response.session_token) {
                throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
              }
              acceptSession(response.session_token);
            }}
          />
        )}
      </div>
    </MagicAuthCard>
  );
}
