import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { Alert, AlertDescription, Button, OtpInput } from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";

const OTP_LENGTH = 6;

interface OtpVerifyPanelProps {
  /** Request (or resend) an OTP. */
  onRequestOtp: () => Promise<void>;
  /** Verify the entered code; throw to surface an error. */
  onVerifyOtp: (otp: string) => Promise<void>;
  /** Seconds the resend button stays disabled after a send. */
  resendCooldownSeconds?: number;
}

/**
 * Shared OTP flow used by every magic-link auth gate: request → segmented input
 * → verify, plus a resend button with the refresh-style spin and a live cooldown
 * countdown. Keeps the two link pages identical.
 */
export function OtpVerifyPanel({
  onRequestOtp,
  onVerifyOtp,
  resendCooldownSeconds = 60,
}: OtpVerifyPanelProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    },
    [],
  );

  function startCooldown(): void {
    setCooldown(resendCooldownSeconds);
    if (timer.current) {
      clearInterval(timer.current);
    }
    timer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1 && timer.current) {
          clearInterval(timer.current);
        }
        return current <= 1 ? 0 : current - 1;
      });
    }, 1000);
  }

  async function handleRequest(): Promise<void> {
    setError("");
    setSending(true);
    try {
      await onRequestOtp();
      setOtpSent(true);
      setOtp("");
      startCooldown();
    } catch (err) {
      setError(getApiErrorMessage(err, "ส่งรหัส OTP ไม่สำเร็จ กรุณาลองใหม่"));
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(): Promise<void> {
    if (otp.length !== OTP_LENGTH || verifying) {
      return;
    }
    setError("");
    setVerifying(true);
    try {
      await onVerifyOtp(otp);
    } catch (err) {
      setError(getApiErrorMessage(err, "รหัส OTP ไม่ถูกต้องหรือหมดอายุ"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!otpSent ? (
        <Button
          fullWidth
          isLoading={sending}
          loadingText="กำลังส่งรหัส"
          onClick={() => void handleRequest()}
        >
          รับรหัส OTP
        </Button>
      ) : (
        <>
          {/* form so Enter (from any OTP box) submits — not click-only */}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleVerify();
            }}
          >
            <OtpInput autoFocus disabled={verifying} onChange={setOtp} value={otp} />
            <Button
              disabled={otp.length !== OTP_LENGTH}
              fullWidth
              isLoading={verifying}
              loadingText="กำลังตรวจสอบ"
              type="submit"
            >
              ตรวจสอบรหัส
            </Button>
          </form>
          <Button
            disabled={cooldown > 0 || sending}
            fullWidth
            icon={RotateCw}
            isLoading={sending}
            loadingIconMotion="refresh"
            loadingText="กำลังส่งรหัส"
            onClick={() => void handleRequest()}
            type="button"
            variant="ghost"
          >
            {cooldown > 0 ? `ส่งรหัสอีกครั้งใน ${cooldown} วินาที` : "ส่งรหัสอีกครั้ง"}
          </Button>
        </>
      )}
    </div>
  );
}
