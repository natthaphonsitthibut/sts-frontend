import { useState } from "react";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";

interface TaskOtpVerificationGateProps {
  token: string;
  onVerified: (sessionToken: string) => void;
}

/** Reusable email-OTP gate for every public task-link page. */
export function TaskOtpVerificationGate({
  token,
  onVerified,
}: TaskOtpVerificationGateProps) {
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle={
        maskedEmail
          ? `ระบบส่งรหัสไปที่ ${maskedEmail}`
          : "รับรหัส OTP ที่อีเมลของผู้รับมอบหมาย"
      }
      title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
    >
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
          writeMagicToken(token, response.session_token, "local");
          onVerified(response.session_token);
        }}
      />
    </MagicAuthCard>
  );
}
