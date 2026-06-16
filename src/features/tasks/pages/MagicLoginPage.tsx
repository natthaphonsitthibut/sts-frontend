import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription } from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { OtpVerifyPanel } from "../../auth/components/OtpVerifyPanel";
import { authService } from "../../auth/api/auth.service";
import {
  getEffectivePermissions,
  getFirstAccessibleRoute,
} from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import type { AuthUser, MagicLoginVerifyResponse } from "../../auth/types/auth.types";

function buildVirtualUser(
  token: string,
  payload: MagicLoginVerifyResponse,
  sessionToken: string,
): AuthUser | null {
  if (!payload.id) return null;
  return {
    id: payload.id,
    username: payload.username || payload.email || `magic-${token}`,
    FirstName: payload.FirstName ?? null,
    LastName: payload.LastName ?? null,
    roles: payload.roles || [],
    labels: payload.labels,
    permissions: payload.permissions || [],
    data_scope: payload.data_scope,
    PersonID_Onec: payload.PersonID_Onec,
    affiliation: payload.affiliation ?? null,
    magic_link_token: token,
    magic_session_token: sessionToken || undefined,
    virtual_login: true,
  };
}

export function MagicLoginPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const saveSession = useAuthSessionStore((state) => state.saveSession);
  const [loading, setLoading] = useState(true);
  const [otpRequired, setOtpRequired] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<MagicLoginVerifyResponse | null>(null);

  const subtitle = useMemo(
    () => payload?.assigned_to_name || payload?.email || "ยืนยันตัวตนผ่านลิงก์",
    [payload],
  );

  const completeLogin = useCallback(async (sessionToken: string) => {
    const nextPayload = await authService.verifyMagicLogin(token, sessionToken || undefined);
    if (nextPayload.otp_required) {
      setPayload(nextPayload);
      setOtpRequired(true);
      return;
    }
    const virtualUser = buildVirtualUser(token, nextPayload, sessionToken);
    if (!virtualUser) throw new Error("Invalid login payload");
    saveSession(virtualUser, { target: "session", hasAdminAccess: true });
    const permissions = getEffectivePermissions(virtualUser.roles, virtualUser.permissions);
    void navigate(getFirstAccessibleRoute(permissions), { replace: true });
  }, [navigate, saveSession, token]);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      setLoading(true);
      setError("");
      try {
        const savedToken = readMagicToken(token, "local");
        await completeLogin(savedToken);
      } catch {
        if (!cancelled) setError("ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [completeLogin, readMagicToken, token]);

  return (
    <MagicAuthCard title="ลิงก์เข้าสู่ระบบ" subtitle={subtitle}>
      {loading ? (
        <SkeletonStack lines={3} className="py-2" />
      ) : otpRequired ? (
        <OtpVerifyPanel
          onRequestOtp={() => authService.requestMagicOtp(token)}
          onVerifyOtp={async (otp) => {
            const response = await authService.verifyMagicOtp(token, otp);
            if (!response.session_token) {
              throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
            }
            writeMagicToken(token, response.session_token, "local");
            await completeLogin(response.session_token);
          }}
        />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </MagicAuthCard>
  );
}
