import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { teacherLineService } from "../api/teacher-line.service";
import { TeacherLineAraIdChallengePanel } from "../components/TeacherLineAraIdChallengePanel";

function readTokens(hash: string): { challengeToken: string; groupToken: string } {
  const params = new URLSearchParams(hash.slice(1));
  const groupToken = params.get("token")?.trim() ?? "";
  const challengeToken = params.get("challenge")?.trim() ?? "";
  return {
    groupToken: /^[a-f0-9]{64}$/i.test(groupToken) ? groupToken : "",
    challengeToken: /^[A-Za-z0-9_-]{32,128}$/.test(challengeToken)
      ? challengeToken
      : "",
  };
}

export function TeacherLineAraIdChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { challengeToken, groupToken } = useMemo(
    () => readTokens(location.hash),
    [location.hash],
  );
  const [binding, setBinding] = useState<{
    bindingToken: string;
    teacherName: string;
  } | null>(null);
  const challenge = useQuery({
    queryKey: ["line-link", "araid-challenge", challengeToken, "details"],
    queryFn: () => teacherLineService.getAraIdChallenge(challengeToken),
    enabled: Boolean(challengeToken),
    retry: false,
  });
  const refreshChallenge = useMutation({
    mutationFn: () => teacherLineService.createAraIdChallenge(groupToken),
    meta: { suppressSuccessToast: true },
    onSuccess: (next) => {
      const params = new URLSearchParams({
        token: groupToken,
        challenge: next.challengeToken,
      });
      void navigate(`/line-link/araid#${params.toString()}`, { replace: true });
    },
  });
  const startAuthorization = useMutation({
    mutationFn: teacherLineService.startAuthorization,
    meta: { suppressSuccessToast: true },
  });
  const handleApproved = useCallback(
    (result: { bindingToken: string; teacherName: string }) => setBinding(result),
    [],
  );

  async function openLineAuthorization(): Promise<void> {
    if (!binding) return;
    try {
      const authorizationUrl = await startAuthorization.mutateAsync(binding.bindingToken);
      window.location.assign(authorizationUrl);
    } catch {
      // The mutation error is rendered below with a retry path.
    }
  }

  if (!groupToken || !challengeToken) {
    return (
      <MagicAuthCard showProfile={false} title="คำขอ AraID ไม่ถูกต้อง">
        <Alert variant="warning">
          <AlertDescription>ลิงก์นี้ไม่ถูกต้อง กรุณากลับไปเลือกวิธียืนยันอีกครั้ง</AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (binding) {
    return (
      <MagicAuthCard
        backLabel="ย้อนกลับ"
        onBack={() => void navigate(`/line-link#token=${groupToken}`)}
        showProfile={false}
        subtitle={binding.teacherName}
        title="ยืนยัน AraID แล้ว"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            ขั้นตอนสุดท้าย เข้าสู่ระบบด้วย LINE เพื่อผูกบัญชีกับข้อมูลครูของคุณ
          </p>
          <Button
            fullWidth
            icon={MessageCircle}
            isLoading={startAuthorization.isPending}
            loadingText="กำลังเปิด LINE"
            onClick={() => void openLineAuthorization()}
          >
            เข้าสู่ระบบด้วย LINE
          </Button>
          {startAuthorization.isError ? (
            <Alert variant="destructive">
              <AlertDescription>เปิดหน้าลงชื่อเข้าใช้ LINE ไม่สำเร็จ กรุณาลองใหม่</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </MagicAuthCard>
    );
  }

  if (challenge.isPending) {
    return (
      <MagicAuthCard showProfile={false} subtitle="กำลังเตรียม QR…" title="ยืนยันผ่าน AraID">
        <div aria-hidden="true" className="h-11 animate-pulse rounded-lg bg-slate-100" />
      </MagicAuthCard>
    );
  }

  if (challenge.isError || !challenge.data) {
    return (
      <MagicAuthCard
        backLabel="ย้อนกลับ"
        onBack={() => void navigate(`/line-link#token=${groupToken}`)}
        showProfile={false}
        title="QR หมดอายุแล้ว"
      >
        <Button
          fullWidth
          isLoading={refreshChallenge.isPending}
          loadingText="กำลังสร้าง QR"
          onClick={() => refreshChallenge.mutate()}
        >
          สร้าง QR และลิงก์ใหม่
        </Button>
      </MagicAuthCard>
    );
  }

  return (
    <TeacherLineAraIdChallengePanel
      challenge={challenge.data}
      isRefreshing={refreshChallenge.isPending}
      key={challenge.data.challengeToken}
      onApproved={handleApproved}
      onBack={() => void navigate(`/line-link#token=${groupToken}`)}
      onRefresh={() => refreshChallenge.mutate()}
    />
  );
}
