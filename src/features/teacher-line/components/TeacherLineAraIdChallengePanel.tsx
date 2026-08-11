import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import {
  teacherLineService,
  type TeacherLineAraIdChallenge,
} from "../api/teacher-line.service";

interface Props {
  challenge: TeacherLineAraIdChallenge;
  isRefreshing: boolean;
  onApproved: (result: { bindingToken: string; teacherName: string }) => void;
  onBack: () => void;
  onRefresh: () => void;
}

export function TeacherLineAraIdChallengePanel({
  challenge,
  isRefreshing,
  onApproved,
  onBack,
  onRefresh,
}: Props) {
  const completed = useRef(false);
  const status = useQuery({
    queryKey: ["line-link", "araid-challenge", challenge.challengeToken, "status"],
    queryFn: () => teacherLineService.pollAraIdChallenge(challenge.challengeToken),
    refetchInterval: (query) =>
      query.state.error || query.state.data?.status === "APPROVED" ? false : 1_500,
    retry: false,
  });
  const inProgress =
    challenge.status === "CLAIMED" || status.data?.status === "IN_PROGRESS";

  useEffect(() => {
    if (status.data?.status !== "APPROVED" || completed.current) return;
    completed.current = true;
    onApproved(status.data);
  }, [onApproved, status.data]);

  return (
    <AraIdQrChallengeView
      expiresAt={status.data?.status === "IN_PROGRESS" ? status.data.expiresAt : challenge.expiresAt}
      hasStatusError={status.isError}
      isInProgress={inProgress}
      isRefreshing={isRefreshing}
      onBack={onBack}
      onRefresh={onRefresh}
      qrDataUrl={challenge.qrDataUrl}
      referenceCode={challenge.referenceCode}
      schoolName={challenge.schoolName}
      verificationUrl={challenge.verificationUrl}
    />
  );
}
