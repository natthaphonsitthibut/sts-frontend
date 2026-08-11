import { useEffect, useRef } from "react";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { useTeacherAccessAraIdChallengeStatus } from "../hooks/useTeacherAccess";
import type { TeacherAccessAraIdChallenge } from "../types/teacher-access.types";

interface Props {
  challenge: TeacherAccessAraIdChallenge;
  isRefreshing: boolean;
  onApproved: (sessionToken: string) => void;
  onBack: () => void;
  onExpired: () => void;
}

export function TeacherAccessAraIdChallengePanel({
  challenge,
  isRefreshing,
  onApproved,
  onBack,
  onExpired,
}: Props) {
  const completed = useRef(false);
  const status = useTeacherAccessAraIdChallengeStatus(challenge.challengeToken);
  const statusData = status.data;
  const inProgress = statusData?.status === "IN_PROGRESS";
  const expiresAt = inProgress ? statusData.expiresAt : challenge.expiresAt;

  useEffect(() => {
    if (status.data?.status !== "APPROVED" || completed.current) return;
    completed.current = true;
    onApproved(status.data.sessionToken);
  }, [onApproved, status.data]);

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
