import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, Input } from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
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
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
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

  async function requestOtp(): Promise<void> {
    setError("");
    await authService.requestMagicOtp(token);
    setOtpSent(true);
  }

  async function verifyOtp(): Promise<void> {
    setError("");
    const response = await authService.verifyMagicOtp(token, otp);
    if (response.session_token) {
      writeMagicToken(token, response.session_token, "local");
      await completeLogin(response.session_token);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-[460px] rounded-lg">
        <CardContent className="p-6">
          <div className="mb-5 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-primary" />
            <h1 className="text-xl font-bold text-slate-900">ลิงก์เข้าสู่ระบบ</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          {loading ? (
            <SkeletonStack lines={3} className="py-2" />
          ) : otpRequired ? (
            <div className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {!otpSent ? (
                <Button fullWidth onClick={() => void requestOtp()}>
                  รับรหัส OTP
                </Button>
              ) : (
                <>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="000000"
                    value={otp}
                  />
                  <Button disabled={otp.length !== 6} fullWidth onClick={() => void verifyOtp()}>
                    ตรวจสอบรหัส
                  </Button>
                </>
              )}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
