import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerDigitsField,
} from "../../../components/base";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { referralReportService } from "../api/referral-report.service";
import {
  REFERRAL_ACCESS_CODE_LENGTH,
  referralAccessCodeSchema,
  type ReferralAccessCodeValues,
} from "../schemas/referral-report.schema";
import type {
  ReferralReportAraIdChallenge,
  ReferralReportReferral,
} from "../types/referral-report.types";

interface ReferralReportAccessGateProps {
  token: string;
  referral: ReferralReportReferral;
  maskedStudentName: string;
  onVerified: (sessionToken: string) => void;
  /** Why the agency is back here, e.g. its link session ran out mid-report. */
  notice?: string;
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
  notice,
  onVerified,
}: ReferralReportAccessGateProps) {
  const form = useForm<ReferralAccessCodeValues>({
    defaultValues: { accessCode: "" },
    resolver: zodResolver(referralAccessCodeSchema),
    mode: "onSubmit",
  });
  const [challenge, setChallenge] =
    useState<ReferralReportAraIdChallenge | null>(null);
  const createChallenge = useMutation({
    mutationFn: (accessCode: string) =>
      referralReportService.createAraIdChallenge(token, accessCode),
    meta: { suppressSuccessToast: true },
    onSuccess: setChallenge,
  });

  if (challenge) {
    return (
      <ReferralAraIdChallengePanel
        challenge={challenge}
        isRefreshing={createChallenge.isPending}
        onApproved={onVerified}
        onBack={() => setChallenge(null)}
        onExpired={() => createChallenge.mutate(form.getValues("accessCode"))}
      />
    );
  }

  function handleSubmit(values: ReferralAccessCodeValues): void {
    if (!createChallenge.isPending) createChallenge.mutate(values.accessCode);
  }

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle={`${referral.agency_name ?? "หน่วยงาน"} · นักเรียน ${maskedStudentName}`}
      title="รายงานผลการส่งต่อ"
    >
      <Form form={form} onSubmit={handleSubmit}>
        <div className="space-y-4">
          {notice ? (
            <Alert data-referral-reverify-notice>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          <FormErrorAlert
            error={createChallenge.error}
            fallback="ตรวจสอบรหัสไม่สำเร็จ กรุณาลองใหม่"
          />
          <FormItem>
            <FormLabel htmlFor="referral-access-code" required>
              รหัสจากโรงเรียน
            </FormLabel>
            <Input
              autoComplete="one-time-code"
              id="referral-access-code"
              inputMode="numeric"
              maxLength={REFERRAL_ACCESS_CODE_LENGTH}
              placeholder="กรอกรหัส 6 หลัก"
              {...registerDigitsField(form, "accessCode")}
            />
            <FormMessage<ReferralAccessCodeValues> name="accessCode" />
            <p className="text-sm text-content-secondary">
              จากนั้นยืนยันตัวตนด้วย AraID เพื่อบันทึกว่าใครเป็นผู้รายงาน
            </p>
          </FormItem>
          <Button
            className="w-full"
            isLoading={createChallenge.isPending}
            loadingText="กำลังตรวจสอบ"
            type="submit"
          >
            ยืนยันตัวตนด้วย AraID
          </Button>
        </div>
      </Form>
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
