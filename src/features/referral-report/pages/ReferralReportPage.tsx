import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  PAGE_MAX_WIDTH_CLASS,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import {
  TrackingStep,
  TrackingStepsCard,
} from "../../../components/layout/tracking-step";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { ReferralSummary } from "../../cases/components/ReferralSummary";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import {
  TaskStudentContactsDialog,
  TaskStudentHomeDialog,
} from "../../tasks/components/TaskStudentDialogs";
import { toTrackingHistoryItems } from "../../tasks/lib/task-presentation";
import { StatusPage } from "../../tasks/pages/StatusPage";
import { referralReportService } from "../api/referral-report.service";
import { ReferralReportAccessGate } from "../components/ReferralReportAccessGate";
import { ReferralReportForm } from "../components/ReferralReportForm";
import { useReferralReportPhoto } from "../hooks/useReferralReportPhoto";
import type { ReferralReportLinkOpen } from "../types/referral-report.types";

/** Kept apart from the teacher links' sessions in the same store. */
function sessionKey(token: string): string {
  return `referral:${token}`;
}

function errorMessage(error: unknown): {
  status: number | null;
  message: string;
} {
  const response = (
    error as {
      response?: { status?: number; data?: { message?: string | string[] } };
    }
  )?.response;
  const raw = response?.data?.message;
  return {
    status: response?.status ?? null,
    message: (Array.isArray(raw) ? raw[0] : raw) || "ไม่สามารถเปิดลิงก์นี้ได้",
  };
}

/**
 * The agency's referral link (tasks/task-agency-referral-report-link.md). Same
 * page as the teacher's home-visit link: the student card, then the steps —
 * 1 what the school sent, 2 the agency's report.
 */
export function ReferralReportPage() {
  const { token = "" } = useParams<{ token: string }>();
  const readMagicToken = useAuthSessionStore((state) => state.readMagicToken);
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [sessionToken, setSessionToken] = useState(() =>
    readMagicToken(sessionKey(token), "local"),
  );
  const [submitted, setSubmitted] = useState(false);

  const linkQuery = useQuery({
    queryKey: ["referral-report", token, sessionToken],
    queryFn: () =>
      referralReportService.getLink(token, sessionToken || undefined),
    enabled: Boolean(token) && !submitted,
    retry: false,
  });
  const submit = useMutation({
    mutationFn: (
      payload: Parameters<typeof referralReportService.submitReport>[2],
    ) => referralReportService.submitReport(token, sessionToken, payload),
    meta: { suppressSuccessToast: true },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <StatusPage
        message="โรงเรียนได้รับรายงานผลการส่งต่อแล้ว ขอบคุณที่ช่วยดูแลนักเรียน"
        primaryLabel="ปิดหน้านี้ได้เลย"
        primaryTo={`/referral-report/${token}`}
        showProfile={false}
        title="ส่งรายงานเรียบร้อย"
        tone="success"
      />
    );
  }

  if (linkQuery.isLoading) {
    return (
      <GuestPageShell showProfile={false}>
        <Card className="rounded-lg p-6">
          <SkeletonStack lines={5} />
        </Card>
      </GuestPageShell>
    );
  }

  if (linkQuery.isError || !linkQuery.data) {
    const { status, message } = errorMessage(linkQuery.error);
    return (
      <StatusPage
        message={message}
        primaryLabel="ลองเปิดอีกครั้ง"
        primaryTo={`/referral-report/${token}`}
        showProfile={false}
        title={status === 409 ? "ลิงก์นี้ใช้งานแล้ว" : "เปิดลิงก์ไม่ได้"}
        tone={
          status === 409 ? "success" : status === 404 ? "neutral" : "warning"
        }
      />
    );
  }

  const link = linkQuery.data;
  if (link.auth_required) {
    return (
      <ReferralReportAccessGate
        maskedStudentName={link.student_name}
        onVerified={(nextSession) => {
          writeMagicToken(sessionKey(token), nextSession, "local");
          setSessionToken(nextSession);
        }}
        referral={link.referral}
        token={token}
      />
    );
  }

  return (
    <ReferralReportView
      error={submit.error}
      isSubmitting={submit.isPending}
      link={link}
      onSubmit={(payload) => submit.mutate(payload)}
      sessionToken={sessionToken}
    />
  );
}

function ReferralReportView({
  error,
  isSubmitting,
  link,
  onSubmit,
  sessionToken,
}: {
  error: unknown;
  isSubmitting: boolean;
  link: ReferralReportLinkOpen;
  onSubmit: Parameters<typeof ReferralReportForm>[0]["onSubmit"];
  sessionToken: string;
}) {
  const [contactsOpen, setContactsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const photoUrl = useReferralReportPhoto(link.student_photo_url, sessionToken);
  const trackingStatus = getCaseTrackingStatusPresentation(
    "AWAITING_REFERRAL_OUTCOME",
  );
  const gradeRoom = [
    link.student_grade,
    link.student_room ? formatRoomLabel(link.student_room) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <GuestPageShell
      contentClassName={cn(PAGE_MAX_WIDTH_CLASS, "space-y-4")}
      profileName={link.reporter_name}
      profileRoleLabel={link.referral.agency_name ?? "หน่วยงาน"}
    >
      <div>
        <h1 className="text-balance text-lg font-bold leading-7 text-slate-900">
          รายงานผลการส่งต่อ
        </h1>
        {/* The report is filed under this name, so the agency sees it before
            it sends anything. */}
        <p className="text-sm text-content-secondary" data-referral-reporter>
          ยืนยันตัวตนแล้วในนาม {link.reporter_name}
        </p>
      </div>
      <StudentTrackingCard
        avatar={
          <StudentAvatar
            className="size-28 shrink-0 text-3xl"
            name={link.student_name || "-"}
            photoUrl={photoUrl}
          />
        }
        historyItems={toTrackingHistoryItems(
          link.follow_up_history,
          link.reason_flagged || "-",
        )}
        name={link.student_name || "-"}
        noteLabel="สาเหตุที่ต้องติดตาม"
        noteValue={link.reason_flagged || "ยังไม่มีรายละเอียดสาเหตุ"}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setMapOpen(true)}
        schoolLine={`${link.student_school || "-"}${gradeRoom ? ` · ${gradeRoom}` : ""}`}
      />
      <TrackingStepsCard
        statusClassName={trackingStatus.textClassName}
        statusLabel={trackingStatus.label}
      >
        <TrackingStep connectNext number={1} title="ส่งต่อหน่วยงาน">
          <ReferralSummary
            agencyKindLabel={link.referral.agency_kind_label}
            agencyName={link.referral.agency_name}
            linkWindow={{
              startsAt: link.referral.starts_at,
              expiresAt: link.referral.expires_at,
            }}
            referralNote={link.referral.referral_note}
            referredAt={link.referral.referred_at}
            referredBy={link.referral.referred_by}
          />
        </TrackingStep>
        <TrackingStep active connectPrev number={2} title="รายงานผลการส่งต่อ">
          <ReferralReportForm
            error={error}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
          />
        </TrackingStep>
      </TrackingStepsCard>

      <TaskStudentContactsDialog
        onOpenChange={setContactsOpen}
        open={contactsOpen}
        task={link}
      />
      <TaskStudentHomeDialog
        onOpenChange={setMapOpen}
        open={mapOpen}
        task={link}
      />
    </GuestPageShell>
  );
}
