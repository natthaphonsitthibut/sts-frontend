import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, Button, Input, Label } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { teacherLineService } from "../api/teacher-line.service";

type Step = "EMAIL" | "OTP" | "CONNECT";

/**
 * Public page a teacher opens to attach their LINE account, normally from the
 * official account's rich menu. It carries no token: identity is proven by the
 * code emailed to the address they type, which is why the same URL can be handed
 * to everyone.
 */
export function TeacherLineLinkPage() {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [binding, setBinding] = useState<{ bindingToken: string; teacherName: string } | null>(
    null,
  );

  const enabledQuery = useQuery({
    queryKey: ["line-link", "status"],
    queryFn: teacherLineService.isEnabled,
  });
  const requestOtp = useMutation({ mutationFn: teacherLineService.requestOtp });
  const startAuthorization = useMutation({ mutationFn: teacherLineService.startAuthorization });

  async function openLineAuthorization(bindingToken: string): Promise<void> {
    try {
      const authorizationUrl = await startAuthorization.mutateAsync(bindingToken);
      window.location.assign(authorizationUrl);
    } catch {
      // React Query retains the error and the alert below explains the retry.
    }
  }

  /**
   * Only moves to the next step — the OTP panel owns sending, so the code is
   * requested once instead of once here and again from the panel's own button.
   */
  function submitEmail(): void {
    setNotice("");
    setStep("OTP");
  }

  if (enabledQuery.isPending) {
    return (
      <MagicAuthCard subtitle="กำลังตรวจสอบบริการ…" title="เชื่อมบัญชี LINE">
        <div aria-hidden="true" className="h-11 animate-pulse rounded-lg bg-slate-100" />
      </MagicAuthCard>
    );
  }

  if (enabledQuery.isError || enabledQuery.data === false) {
    return (
      <MagicAuthCard title="เชื่อมบัญชี LINE">
        <Alert variant="warning">
          <AlertDescription>
            ระบบเชื่อมบัญชี LINE ยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบของโรงเรียน
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (step === "CONNECT" && binding) {
    return (
      <MagicAuthCard subtitle={binding.teacherName} title="ยืนยันอีเมลแล้ว">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            ขั้นตอนสุดท้าย เข้าสู่ระบบด้วย LINE เพื่อผูกบัญชีกับข้อมูลครูของคุณ
            และอย่าลืมกดเพิ่มเพื่อนกับบัญชีทางการของโรงเรียนในหน้าถัดไป
            เพราะระบบส่งลิงก์ให้ได้เฉพาะคนที่เพิ่มเพื่อนแล้วเท่านั้น
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

  if (step === "OTP") {
    return (
      <MagicAuthCard subtitle={email} title="กรอกรหัสยืนยัน">
        <div className="space-y-4">
          {notice ? (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          <OtpVerifyPanel
            onRequestOtp={async () => {
              setNotice(await requestOtp.mutateAsync(email.trim()));
            }}
            onVerifyOtp={async (code) => {
              setBinding(await teacherLineService.verifyOtp(email.trim(), code));
              setStep("CONNECT");
            }}
          />
        </div>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard subtitle="สำหรับคุณครู" title="เชื่อมบัญชี LINE">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitEmail();
        }}
      >
        <div>
          <Label htmlFor="line-link-email" required>
            อีเมลของคุณครู
          </Label>
          <Input
            autoComplete="email"
            id="line-link-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.ac.th"
            type="email"
            value={email}
          />
          <p className="mt-2 text-xs text-slate-500">
            ใช้อีเมลที่แจ้งไว้กับโรงเรียน ระบบจะส่งรหัสยืนยัน 6 หลักไปให้
          </p>
        </div>
        <Button disabled={!email.trim()} fullWidth type="submit">
          ถัดไป
        </Button>
      </form>
    </MagicAuthCard>
  );
}
