import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { ErrorState, SkeletonCards } from "../../../components/layout/page-primitives";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { TeacherAccessOtpRequiredError } from "../api/teacher-access.service";
import {
  useRequestTeacherAccessOtp,
  useTeacherAccessContext,
  useVerifyTeacherAccessOtp,
} from "../hooks/useTeacherAccess";
import {
  useTeacherLinkSessionStore,
  type TeacherLinkCredential,
} from "../store/teacher-link-session.store";

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
 * credential, forces the emailed OTP before any student data loads, and hands
 * the verified context to the pages below.
 */
export function TeacherLinkLayout() {
  const token = useTeacherLinkSessionStore((state) => state.token);
  const sessionToken = useTeacherLinkSessionStore((state) => state.sessionToken);
  const setToken = useTeacherLinkSessionStore((state) => state.setToken);
  const setSessionToken = useTeacherLinkSessionStore((state) => state.setSessionToken);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  useEffect(() => {
    const fragmentToken = consumeFragmentToken();
    if (fragmentToken) setToken(fragmentToken);
  }, [setToken]);

  const credential: TeacherLinkCredential = { token, sessionToken };
  const contextQuery = useTeacherAccessContext(credential);
  const requestOtp = useRequestTeacherAccessOtp();
  const verifyOtp = useVerifyTeacherAccessOtp();

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

  if (contextQuery.error instanceof TeacherAccessOtpRequiredError) {
    return (
      <MagicAuthCard
        subtitle={
          maskedEmail
            ? `ระบบส่งรหัสไปที่ ${maskedEmail}`
            : "ระบบจะส่งรหัสยืนยันไปยังอีเมลของคุณ"
        }
        title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
      >
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
