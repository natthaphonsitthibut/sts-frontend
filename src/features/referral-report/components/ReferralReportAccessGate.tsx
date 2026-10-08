import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, FormErrorAlert, Input, Label } from "../../../components/base";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { referralReportService } from "../api/referral-report.service";
import type {
  ReferralReportAraIdChallenge,
  ReferralReportReferral,
} from "../types/referral-report.types";

const ACCESS_CODE_LENGTH = 6;

interface ReferralReportAccessGateProps {
  token: string;
  referral: ReferralReportReferral;
  maskedStudentName: string;
  onVerified: (sessionToken: string) => void;
}

/**
 * The agency's way in: the code the school passed on, then AraID — which also
 * records who is reporting. Same centred card and QR view as the teacher's
 * home-visit link.
 */
export function ReferralReportAccessGate({
  token,
  referral,
  maskedStudentName,
  onVerified,
}: ReferralReportAccessGateProps) {
  const [accessCode, setAccessCode] = useState("");
  const [challenge, setChallenge] =
    useState<ReferralReportAraIdChallenge | null>(null);
  const createChallenge = useMutation({
    mutationFn: () =>
      referralReportService.createAraIdChallenge(token, accessCode),
    meta: { suppressSuccessToast: true },
    onSuccess: setChallenge,
  });
  const codeReady = new RegExp(`^\\d{${ACCESS_CODE_LENGTH}}$`).test(accessCode);

  if (challenge) {
    return (
      <ReferralAraIdChallengePanel
        challenge={challenge}
        isRefreshing={createChallenge.isPending}
        onApproved={onVerified}
        onBack={() => setChallenge(null)}
        onExpired={() => createChallenge.mutate()}
      />
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (codeReady && !createChallenge.isPending) createChallenge.mutate();
  }

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle={`${referral.agency_name ?? "หน่วยงาน"} · นักเรียน ${maskedStudentName}`}
      title="รายงานผลการส่งต่อ"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormErrorAlert
          error={createChallenge.error}
          fallback="ตรวจสอบรหัสไม่สำเร็จ กรุณาลองใหม่"
        />
        <div className="space-y-2">
          <Label htmlFor="referral-access-code" required>
            รหัสจากโรงเรียน
          </Label>
          <Input
            autoComplete="one-time-code"
            id="referral-access-code"
            inputMode="numeric"
            maxLength={ACCESS_CODE_LENGTH}
            onChange={(event) =>
              setAccessCode(event.target.value.replace(/\D/g, ""))
            }
            placeholder="กรอกรหัส 6 หลัก"
            value={accessCode}
          />
          <p className="text-sm text-content-secondary">
            จากนั้นยืนยันตัวตนด้วย AraID เพื่อบันทึกว่าใครเป็นผู้รายงาน
          </p>
        </div>
        <Button
          className="w-full"
          disabled={!codeReady}
          isLoading={createChallenge.isPending}
          loadingText="กำลังตรวจสอบ"
          type="submit"
        >
          ยืนยันตัวตนด้วย AraID
        </Button>
      </form>
    </MagicAuthCard>
  );
}

function ReferralAraIdChallengePanel({
  challenge,
  isRefreshing,
  onApproved,
  onBack,
  onExpired,
}: {
  challenge: ReferralReportAraIdChallenge;
  isRefreshing: boolean;
  onApproved: (sessionToken: string) => void;
  onBack: () => void;
  onExpired: () => void;
}) {
  const completed = useRef(false);
  const status = useQuery({
    queryKey: ["referral-araid-challenge", challenge.challengeToken],
    queryFn: () =>
      referralReportService.pollAraIdChallenge(challenge.challengeToken),
    refetchInterval: 2_000,
    retry: false,
  });
  const statusData = status.data;
  const inProgress = statusData?.status === "IN_PROGRESS";

  useEffect(() => {
    if (statusData?.status !== "APPROVED" || completed.current) return;
    completed.current = true;
    onApproved(statusData.sessionToken);
  }, [onApproved, statusData]);

  return (
    <AraIdQrChallengeView
      expiresAt={inProgress ? statusData.expiresAt : challenge.expiresAt}
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
