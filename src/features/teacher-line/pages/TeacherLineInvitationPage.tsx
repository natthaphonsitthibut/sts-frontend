import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { DevelopmentGoogleEmailForm } from "../../auth/components/DevelopmentGoogleEmailForm";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { teacherLineService } from "../api/teacher-line.service";

function readInvitationToken(): string {
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim() ??
    "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

export function TeacherLineInvitationPage() {
  const [token] = useState(readInvitationToken);
  const [showDevelopmentGoogle, setShowDevelopmentGoogle] = useState(false);
  const invitationQuery = useQuery({
    queryKey: ["line-link-invitation", "resolve"],
    queryFn: () => teacherLineService.resolveInvitation(token),
    enabled: Boolean(token),
    retry: false,
    gcTime: 0,
  });
  const startGoogle = useMutation({
    mutationFn: (email?: string) =>
      email
        ? teacherLineService.startDevelopmentInvitationGoogle(token, email)
        : teacherLineService.startInvitationGoogle(token),
    meta: { suppressSuccessToast: true },
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
  });

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
      <MagicAuthCard
        showProfile={false}
        subtitle="กำลังตรวจสอบคำเชิญ…"
        title="ยืนยันบัญชี LINE"
      >
        <div
          aria-hidden="true"
          className="h-11 animate-pulse rounded-lg bg-slate-100"
        />
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle={`${invitationQuery.data.teacherName} · ${invitationQuery.data.maskedEmail}`}
      title="ยืนยันบัญชี LINE"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          เข้าสู่ระบบ Google ด้วยอีเมลครูประจำชั้นตามคำเชิญนี้
          จากนั้นระบบจะพาไปเชื่อมบัญชี LINE
        </p>
        {startGoogle.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Google Login ไม่สำเร็จ
              กรุณาตรวจว่าใช้อีเมลของครูประจำชั้นตามคำเชิญ
            </AlertDescription>
          </Alert>
        ) : null}
        {showDevelopmentGoogle ? (
          <DevelopmentGoogleEmailForm
            isSubmitting={startGoogle.isPending}
            onBack={() => {
              startGoogle.reset();
              setShowDevelopmentGoogle(false);
            }}
            onSubmit={(email) => startGoogle.mutate(email)}
            submitLabel="ยืนยันอีเมลและเชื่อม LINE"
          />
        ) : (
          <Button
            fullWidth
            isLoading={startGoogle.isPending}
            loadingText="กำลังเปิด Google"
            onClick={() => {
              if (appConfig.isDevelopment) {
                setShowDevelopmentGoogle(true);
                return;
              }
              startGoogle.mutate(undefined);
            }}
          >
            ยืนยันด้วย Google
          </Button>
        )}
      </div>
    </MagicAuthCard>
  );
}
