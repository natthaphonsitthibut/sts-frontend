import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Alert, AlertDescription } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  ErrorState,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { TeacherAccessVerificationRequiredError } from "../api/teacher-access.service";
import { TeacherAccessAraIdChallengePanel } from "../components/TeacherAccessAraIdChallengePanel";
import {
  useCreateTeacherAccessAraIdChallenge,
  useRequestTeacherAccessOtp,
  useTeacherAccessContext,
  useVerifyTeacherAccessOtp,
} from "../hooks/useTeacherAccess";
import {
  useTeacherLinkSessionStore,
  type TeacherLinkCredential,
} from "../store/teacher-link-session.store";
import type { TeacherAccessAraIdChallenge } from "../types/teacher-access.types";

/** Reads `#token=…` once, then strips it so the credential never stays in the URL. */
function consumeFragmentToken(): string {
  if (typeof window === "undefined") return "";
  const fragment = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const token = new URLSearchParams(fragment).get("token")?.trim() ?? "";
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
  return token;
}

/**
 * Everything behind a teacher link renders inside this gate: it owns the link
 * credential, requires AraID or email OTP before any student data loads, and
 * hands the verified context to the pages below.
 */
export function TeacherLinkLayout() {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore(
    (state) => state.sessionToken,
  );
  const setToken = useTeacherLinkSessionStore((state) => state.setToken);
  const setSessionToken = useTeacherLinkSessionStore(
    (state) => state.setSessionToken,
  );
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [method, setMethod] = useState<"EMAIL" | "ARAID" | null>(null);
  const [araIdChallenge, setAraIdChallenge] =
    useState<TeacherAccessAraIdChallenge | null>(null);

  useEffect(() => {
    const fragmentToken = consumeFragmentToken();
    if (fragmentToken) setToken(fragmentToken);
  }, [setToken]);

  const credential: TeacherLinkCredential = { token, sessionToken };
  const contextQuery = useTeacherAccessContext(credential);
  const requestOtp = useRequestTeacherAccessOtp();
  const verifyOtp = useVerifyTeacherAccessOtp();
  const createAraIdChallenge = useCreateTeacherAccessAraIdChallenge();

  if (!token) {
    return (
      <GuestPageShell as="main" centered contentClassName="max-w-lg">
        <ErrorState
          description="กรุณาเปิดลิงก์ฉบับเต็มที่ได้รับจากผู้ดูแลโรงเรียนอีกครั้ง"
          title="ลิงก์ไม่ครบถ้วน"
        />
      </GuestPageShell>
    );
  }

  if (contextQuery.error instanceof TeacherAccessVerificationRequiredError) {
    if (araIdChallenge) {
      return (
        <TeacherAccessAraIdChallengePanel
          challenge={araIdChallenge}
          isRefreshing={createAraIdChallenge.isPending}
          onApproved={(issued) => {
            setSessionToken(issued);
            setAraIdChallenge(null);
            void contextQuery.refetch();
          }}
          onBack={() => {
            setAraIdChallenge(null);
            setMethod(null);
          }}
          onExpired={() => {
            void createAraIdChallenge
              .mutateAsync(token)
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
                สร้างคำขอยืนยันผ่าน AraID ไม่สำเร็จ กรุณาลองใหม่
              </AlertDescription>
            </Alert>
          ) : null}
          {method === null ? (
            <IdentityMethodChoice
              araIdDescription="ยืนยันด้วยเลขประจำตัวที่ผูกกับข้อมูลครู"
              disabled={createAraIdChallenge.isPending}
              emailDescription="รับรหัส OTP ที่อีเมลของครู"
              onChooseAraId={() => {
                  setMethod("ARAID");
                  void createAraIdChallenge
                    .mutateAsync(token)
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
            <div className="space-y-4">
              <OtpVerifyPanel
                onRequestOtp={async () => {
                  const challenge = await requestOtp.mutateAsync(token);
                  setMaskedEmail(challenge.maskedEmail);
                }}
                onVerifyOtp={async (otp) => {
                  const issued = await verifyOtp.mutateAsync({ token, otp });
                  setSessionToken(issued);
                  await contextQuery.refetch();
                }}
              />
            </div>
          )}
        </div>
      </MagicAuthCard>
    );
  }

  if (contextQuery.isLoading) {
    return (
      <GuestPageShell as="main">
        <SkeletonCards count={4} />
      </GuestPageShell>
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <GuestPageShell as="main" centered contentClassName="max-w-lg">
        <ErrorState
          description="ลิงก์อาจหมดอายุ ถูกเปลี่ยน หรือถูกเพิกถอนแล้ว กรุณาติดต่อผู้ดูแลโรงเรียน"
          onRetry={() => void contextQuery.refetch()}
          title="ไม่สามารถเข้าใช้งานได้"
        />
      </GuestPageShell>
    );
  }

  return <Outlet context={{ credential, context: contextQuery.data }} />;
}
