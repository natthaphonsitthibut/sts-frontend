import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
} from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import {
  teacherLineService,
} from "../api/teacher-line.service";

type Step = "METHOD" | "EMAIL" | "OTP" | "CONNECT";

function readGroupToken(): string {
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim() ?? "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

/**
 * Public page a teacher opens to attach their LINE account, normally from the
 * group link. The opaque token only opens the time-bounded entry window;
 * identity is still proven by the code emailed to the address they type.
 */
export function TeacherLineLinkPage() {
  const navigate = useNavigate();
  const [token] = useState(readGroupToken);
  const [step, setStep] = useState<Step>("METHOD");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [binding, setBinding] = useState<{
    bindingToken: string;
    teacherName: string;
  } | null>(null);

  const enabledQuery = useQuery({
    queryKey: ["line-link", "status"],
    queryFn: teacherLineService.isEnabled,
  });
  const invitationQuery = useQuery({
    queryKey: ["line-link", "group-invitation", token],
    queryFn: () => teacherLineService.resolveGroupInvitation(token),
    enabled: Boolean(token),
    retry: false,
    gcTime: 0,
  });
  const requestOtp = useMutation({
    mutationFn: (address: string) => teacherLineService.requestOtp(token, address),
    meta: { suppressSuccessToast: true },
  });
  const startAuthorization = useMutation({
    mutationFn: teacherLineService.startAuthorization,
    meta: { suppressSuccessToast: true },
  });
  const createAraIdChallenge = useMutation({
    mutationFn: () => teacherLineService.createAraIdChallenge(token),
    meta: { suppressSuccessToast: true },
  });

  async function chooseAraId(): Promise<void> {
    try {
      const challenge = await createAraIdChallenge.mutateAsync();
      const params = new URLSearchParams({
        token,
        challenge: challenge.challengeToken,
      });
      void navigate(`/line-link/araid#${params.toString()}`);
    } catch {
      // The visible mutation error below explains why the QR could not be created.
    }
  }

  async function openLineAuthorization(bindingToken: string): Promise<void> {
    try {
      const authorizationUrl =
        await startAuthorization.mutateAsync(bindingToken);
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

  if (enabledQuery.isPending || (token && invitationQuery.isPending)) {
    return (
      <MagicAuthCard showProfile={false} subtitle="กำลังตรวจสอบบริการ…" title="เชื่อมบัญชี LINE">
        <div
          aria-hidden="true"
          className="h-11 animate-pulse rounded-lg bg-slate-100"
        />
      </MagicAuthCard>
    );
  }

  if (enabledQuery.isError || enabledQuery.data === false) {
    return (
      <MagicAuthCard showProfile={false} title="เชื่อมบัญชี LINE">
        <Alert variant="warning">
          <AlertDescription>
            ระบบเชื่อมบัญชี LINE ยังไม่เปิดใช้งาน
            กรุณาติดต่อผู้ดูแลระบบของโรงเรียน
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }


  const invitation = invitationQuery.data;
  if (!token || invitationQuery.isError || !invitation) {
    return (
      <MagicAuthCard showProfile={false} title="ลิงก์ยืนยัน LINE ใช้ไม่ได้">
        <Alert variant="warning">
          <AlertDescription>
            ลิงก์นี้ไม่ถูกต้อง ถูกปิด หรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (invitation.status === "PENDING") {
    return (
      <MagicAuthCard
        showProfile={false}
        subtitle={invitation.schoolName}
        title="ลิงก์ยังไม่เปิดใช้งาน"
      >
        <Alert variant="warning">
          <AlertDescription>
            เริ่มใช้งานวันที่ {new Date(invitation.startsAt).toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (step === "CONNECT" && binding) {
    return (
      <MagicAuthCard
        showProfile={false}
        subtitle={`${binding.teacherName} · ${invitation.schoolName}`}
        title="ยืนยันอีเมลแล้ว"
      >
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
      <MagicAuthCard
        backLabel="เปลี่ยนอีเมล"
        onBack={() => setStep("EMAIL")}
        showProfile={false}
        subtitle={`${invitation.schoolName} · ${email}`}
        title="กรอกรหัสยืนยัน"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            หากไม่ได้รับรหัส กรุณาตรวจว่าใช้อีเมลครูที่ขึ้นทะเบียนกับ {invitation.schoolName}
          </p>
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
              setBinding(
                await teacherLineService.verifyOtp(token, email.trim(), code),
              );
              setStep("CONNECT");
            }}
          />
        </div>
      </MagicAuthCard>
    );
  }

  if (step === "METHOD") {
    return (
      <MagicAuthCard
        cardContentClassName="min-h-[23.625rem]"
        showProfile={false}
        subtitle={`ลิงก์สำหรับ ${invitation.schoolName}`}
        title="เลือกวิธียืนยันตัวตน"
      >
        <div className="space-y-4">
          {createAraIdChallenge.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                สร้าง QR สำหรับยืนยันผ่าน AraID ไม่สำเร็จ กรุณาลองใหม่
              </AlertDescription>
            </Alert>
          ) : null}
          <IdentityMethodChoice
            araIdDescription="ยืนยันด้วยเลขประจำตัวที่ผูกกับข้อมูลครู"
            disabled={createAraIdChallenge.isPending}
            emailDescription="รับรหัส OTP ที่อีเมลของครู"
            onChooseAraId={() => void chooseAraId()}
            onChooseEmail={() => setStep("EMAIL")}
          />
        </div>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      backLabel="เปลี่ยนวิธียืนยัน"
      cardContentClassName="min-h-[23.625rem]"
      onBack={() => setStep("METHOD")}
      showProfile={false}
      subtitle={`สำหรับคุณครู · ${invitation.schoolName}`}
      title="ยืนยันด้วยอีเมล"
    >
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
            ใช้อีเมลครูที่อยู่ใน {invitation.schoolName} ระบบจะส่งรหัสยืนยัน 6 หลักไปให้
          </p>
        </div>
        <Button disabled={!email.trim()} fullWidth type="submit">
          ถัดไป
        </Button>
      </form>
    </MagicAuthCard>
  );
}
