import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { taskService } from "../api/task.service";
import type { TaskAraIdChallenge } from "../types/task.types";

interface TaskAraIdChallengePanelProps {
  challenge: TaskAraIdChallenge;
  isRefreshing: boolean;
  onApproved: (sessionToken: string) => void;
  onBack: () => void;
  onExpired: () => void;
}

/**
 * Waits for the AraID app to approve a follow-up/assistance link challenge.
 * Same shape as the teacher-link panel — it only swaps in this flow's status
 * endpoint, so both share `AraIdQrChallengeView`.
 */
export function TaskAraIdChallengePanel({
  challenge,
  isRefreshing,
  onApproved,
  onBack,
  onExpired,
}: TaskAraIdChallengePanelProps) {
  const completed = useRef(false);
  const status = useQuery({
    queryKey: ["task-araid-challenge", challenge.challengeToken],
    queryFn: () => taskService.pollTaskAraIdChallenge(challenge.challengeToken),
    refetchInterval: 2_000,
    retry: false,
  });
  const statusData = status.data;
  const inProgress = statusData?.status === "IN_PROGRESS";
  const expiresAt = inProgress ? statusData.expiresAt : challenge.expiresAt;

  useEffect(() => {
    if (statusData?.status !== "APPROVED" || completed.current) return;
    completed.current = true;
    onApproved(statusData.sessionToken);
  }, [onApproved, statusData]);

  return (
    <AraIdQrChallengeView
      expiresAt={expiresAt}
      hasStatusError={status.isError}
      isInProgress={inProgress}
      isRefreshing={isRefreshing}
      onBack={onBack}
      onRefresh={onExpired}
      qrDataUrl={challenge.qrDataUrl}
      referenceCode={challenge.referenceCode}
      verificationUrl={challenge.verificationUrl}
    />
  );
}
