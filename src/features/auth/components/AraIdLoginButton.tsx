import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { authService } from "../api/auth.service";
import { usePostLoginRedirect } from "../hooks/usePostLoginRedirect";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AraIdLoginChallenge } from "../types/auth.types";
import { AraIdQrChallengeView } from "./AraIdQrChallengeView";

function AraIdLoginChallengePanel({
  challenge,
  isRefreshing,
  onBack,
  onRefresh,
}: {
  challenge: AraIdLoginChallenge;
  isRefreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const completed = useRef(false);
  const saveSession = useAuthSessionStore((state) => state.saveSession);
  const redirectAfterLogin = usePostLoginRedirect();
  const status = useQuery({
    queryKey: ["araid-login-challenge", challenge.challengeToken],
    queryFn: () => authService.pollAraIdLoginChallenge(challenge.challengeToken),
    // Stop once the challenge is gone (410) or already spent: a fixed interval
    // keeps asking a dead challenge every two seconds for as long as the tab is
    // open, and the login bucket is shared with the honest attempt that follows.
    refetchInterval: (query) => (query.state.error ? false : 2_000),
    retry: false,
  });
  const statusData = status.data;
  const inProgress = statusData?.status === "IN_PROGRESS";
  const expiresAt = inProgress ? statusData.expiresAt ?? challenge.expiresAt : challenge.expiresAt;

  useEffect(() => {
    if (statusData?.status !== "APPROVED" || completed.current) return;
    completed.current = true;
    void authService
      .getMyProfile()
      .then((user) => {
        saveSession(user, { target: "local", hasAdminAccess: true });
        redirectAfterLogin(user);
      })
      .catch(() => {
        completed.current = false;
      });
  }, [redirectAfterLogin, saveSession, statusData]);

  return (
    <AraIdQrChallengeView
      expiresAt={expiresAt}
      hasStatusError={status.isError}
      isInProgress={inProgress}
      isRefreshing={isRefreshing}
      onBack={onBack}
      onRefresh={onRefresh}
      qrDataUrl={challenge.qrDataUrl}
      referenceCode={challenge.referenceCode}
      verificationUrl={challenge.verificationUrl}
    />
  );
}

export function AraIdLoginButton() {
  const [challenge, setChallenge] = useState<AraIdLoginChallenge | null>(null);
  const createChallenge = useMutation({ mutationFn: authService.createAraIdLoginChallenge });

  function requestChallenge(): void {
    void createChallenge.mutateAsync().then(setChallenge).catch(() => undefined);
  }

  if (challenge) {
    return (
      <AraIdLoginChallengePanel
        challenge={challenge}
        isRefreshing={createChallenge.isPending}
        onBack={() => setChallenge(null)}
        onRefresh={requestChallenge}
      />
    );
  }

  return (
    <div className="space-y-3">
      {createChallenge.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(createChallenge.error, "สร้าง QR สำหรับ AraID ไม่สำเร็จ กรุณาลองใหม่")}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="mx-auto block h-12 max-w-sm text-base font-bold"
        fullWidth
        isLoading={createChallenge.isPending}
        loadingText="กำลังสร้าง QR"
        onClick={requestChallenge}
        type="button"
      >
        เข้าสู่ระบบด้วย AraID
      </Button>
    </div>
  );
}
