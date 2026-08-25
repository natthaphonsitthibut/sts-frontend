import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { formatThaiDateTime } from "../../../lib/date-time";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { DevelopmentGoogleEmailForm } from "../../auth/components/DevelopmentGoogleEmailForm";
import { teacherLineService } from "../api/teacher-line.service";

function readGroupToken(): string {
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim() ??
    "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

export function TeacherLineLinkPage() {
  const navigate = useNavigate();
  const [token] = useState(readGroupToken);
  const [showDevelopmentGoogle, setShowDevelopmentGoogle] = useState(false);
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
  const startGoogle = useMutation({
    mutationFn: (email?: string) =>
      email
        ? teacherLineService.startDevelopmentGroupGoogle(token, email)
        : teacherLineService.startGroupGoogle(token),
    meta: { suppressSuccessToast: true },
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
  });
  const createAraIdChallenge = useMutation({
    mutationFn: () => teacherLineService.createAraIdChallenge(token),
    meta: { suppressSuccessToast: true },
    onSuccess: (challenge) => {
      const params = new URLSearchParams({
        token,
        challenge: challenge.challengeToken,
      });
      void navigate(`/line-link/araid#${params.toString()}`);
    },
  });

  if (enabledQuery.isPending || (token && invitationQuery.isPending)) {
    return (
      <MagicAuthCard
        showProfile={false}
        subtitle="กำลังตรวจสอบบริการ…"
        title="เชื่อมบัญชี LINE"
      >
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
            ลิงก์นี้ไม่ถูกต้อง ถูกปิด หรือหมดอายุแล้ว
            กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ
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
            เริ่มใช้งานวันที่ {formatThaiDateTime(invitation.startsAt)}
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      cardContentClassName="min-h-[23.625rem]"
      showProfile={false}
      subtitle={`เฉพาะครูประจำชั้น · ${invitation.schoolName}`}
      title="เลือกวิธียืนยันตัวตน"
    >
      <div className="space-y-4">
        {startGoogle.error || createAraIdChallenge.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              ยืนยันตัวตนไม่สำเร็จ
              กรุณาตรวจว่าเป็นครูประจำชั้นที่เปิดใช้งานในโรงเรียนนี้
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
          <IdentityMethodChoice
            araIdDescription="ยืนยันด้วย AraID ของครูประจำชั้นในโรงเรียน"
            disabled={startGoogle.isPending || createAraIdChallenge.isPending}
            emailDescription="ยืนยันด้วยบัญชี Google ที่ตรงกับอีเมลครูประจำชั้น"
            emailLabel="Google"
            onChooseAraId={() => createAraIdChallenge.mutate()}
            onChooseEmail={() => {
              if (appConfig.isDevelopment) {
                setShowDevelopmentGoogle(true);
                return;
              }
              startGoogle.mutate(undefined);
            }}
          />
        )}
      </div>
    </MagicAuthCard>
  );
}
