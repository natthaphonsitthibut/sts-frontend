import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService } from "../api/auth.service";
import { usePostLoginRedirect } from "../hooks/usePostLoginRedirect";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AraIdLoginChallenge } from "../types/auth.types";
import { AraIdQrChallengeView } from "./AraIdQrChallengeView";

/**
 * Staff AraID login, shaped like the identity check a guest link shows: the page
 * swaps to this full screen instead of growing a panel under the password form,
 * and the screen itself is the same `AraIdQrChallengeView` the teacher-access,
 * teacher-line and task-link panels render.
 */
export function AraIdLoginChallengePanel({
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
