import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { teacherLineService } from "../api/teacher-line.service";

type Step = "OTP" | "CONNECT";

function readInvitationToken(): string {
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim() ??
    "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

/** Public single-use invitation. The bearer token stays in the URL fragment and POST bodies. */
export function TeacherLineInvitationPage() {
  const [token] = useState(readInvitationToken);
  const [step, setStep] = useState<Step>("OTP");
  const [notice, setNotice] = useState("");
  const [binding, setBinding] = useState<{
    bindingToken: string;
    teacherName: string;
  } | null>(null);
  const invitationQuery = useQuery({
    queryKey: ["line-link-invitation", "resolve"],
    queryFn: () => teacherLineService.resolveInvitation(token),
    enabled: Boolean(token),
    retry: false,
    gcTime: 0,
  });
  const requestOtp = useMutation({
    mutationFn: () => teacherLineService.requestInvitationOtp(token),
  });
  const startAuthorization = useMutation({
    mutationFn: teacherLineService.startAuthorization,
  });

  async function openLineAuthorization(bindingToken: string): Promise<void> {
    try {
      const authorizationUrl =
        await startAuthorization.mutateAsync(bindingToken);
      window.location.assign(authorizationUrl);
    } catch {
      // React Query exposes the safe, token-free error below.
    }
  }

  if (!token || invitationQuery.isError) {
    return (
      <MagicAuthCard showProfile={false} title="ลิงก์ยืนยัน LINE ใช้ไม่ได้">
        <Alert variant="warning">
          <AlertDescription>
            ลิงก์นี้ไม่ถูกต้อง หมดอายุ ถูกยกเลิก หรือถูกใช้ไปแล้ว
            กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (invitationQuery.isPending) {
    return (
      <MagicAuthCard subtitle="กำลังตรวจสอบคำเชิญ…" title="ยืนยันบัญชี LINE">
        <div
          aria-hidden="true"
          className="h-11 animate-pulse rounded-lg bg-slate-100"
        />
      </MagicAuthCard>
    );
  }

  if (step === "CONNECT" && binding) {
    return (
      <MagicAuthCard subtitle={binding.teacherName} title="ยืนยันอีเมลแล้ว">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            เข้าสู่ระบบด้วย LINE เพื่อเชื่อมบัญชีกับข้อมูลครู
            หากบัญชีนี้เชื่อมอยู่แล้ว ระบบจะไม่เปลี่ยนการเชื่อมต่อเดิม
          </p>
          <Button
            fullWidth
            icon={MessageCircle}
            isLoading={startAuthorization.isPending}
            loadingText="กำลังเปิด LINE"
            onClick={() => void openLineAuthorization(binding.bindingToken)}
          >
            เข้าสู่ระบบด้วย LINE
          </Button>
          {startAuthorization.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                เปิดหน้าลงชื่อเข้าใช้ LINE ไม่สำเร็จ กรุณาลองใหม่
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      subtitle={`${invitationQuery.data.teacherName} · ${invitationQuery.data.maskedEmail}`}
      title="ยืนยันบัญชี LINE"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          รับรหัส OTP ทางอีเมลที่ลงทะเบียนไว้ แล้วกรอกรหัสเพื่อดำเนินการต่อ
        </p>
        {notice ? (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        <OtpVerifyPanel
          onRequestOtp={async () => {
            setNotice(await requestOtp.mutateAsync());
          }}
          onVerifyOtp={async (code) => {
            setBinding(
              await teacherLineService.verifyInvitationOtp(token, code),
            );
            setStep("CONNECT");
          }}
        />
      </div>
    </MagicAuthCard>
  );
}
