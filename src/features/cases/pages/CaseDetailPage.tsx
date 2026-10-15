import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  MessageSquareText,
  PhoneCall,
} from "lucide-react";
import { useParams } from "react-router-dom";
import {
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  PersonIcon,
} from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  getNavigationLabel,
  useSafeBackTarget,
} from "../../../components/layout/navigation-context";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { StudentTrackingCard } from "../../../components/layout/student-tracking-card";
import { StudentObservationHistory } from "../../teacher-comments/components/StudentObservationHistory";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTrackingTimeline } from "../components/CaseTrackingTimeline";
import { useCaseDetail } from "../hooks/useCaseDetail";
import type { CaseReviewAction } from "../types/cases.types";
import { HomeLocationDialog } from "../../students/components/HomeLocationDialog";
import { toTrackingHistoryItems } from "../../tasks/lib/task-presentation";
import { usePermissions } from "../../auth/hooks/usePermissions";

export function CaseDetailPage() {
  const { can } = usePermissions();
  const safeBackTarget = useSafeBackTarget();
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = Number(caseIdParam);
  const [reviewAction, setReviewAction] = useState<CaseReviewAction | null>(
    null,
  );
  const [contactsOpen, setContactsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const detailQuery = useCaseDetail(
    Number.isInteger(caseId) && caseId > 0 ? caseId : undefined,
  );
  const caseRecord = detailQuery.data?.data;
  const returnTo =
    typeof safeBackTarget === "string" && safeBackTarget !== "/"
      ? safeBackTarget
      : "/student-risk-report/risk";
  const returnLabel = getNavigationLabel(returnTo);

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-5">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          description="กรุณาตรวจสอบสิทธิ์หรือทดลองโหลดข้อมูลอีกครั้ง"
          onRetry={() => void detailQuery.refetch()}
          title="โหลดรายละเอียดเคสไม่สำเร็จ"
        />
      </PageShell>
    );
  }

  if (!caseRecord) {
    return (
      <PageShell>
        <EmptyState
          action={
            <NavButton to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          }
          description="เคสนี้อาจอยู่นอกขอบเขตข้อมูลของคุณหรือถูกนำออกแล้ว"
          icon={FileText}
          title="ไม่พบเคส"
        />
      </PageShell>
    );
  }

  // The student's visits across all of their cases, the same list the
  // follow-up link shows — a fresh case must not look like nobody ever went.
  const historyItems = toTrackingHistoryItems(
    caseRecord.student_follow_up_history,
    caseRecord.reason_flagged || "-",
  );

  return (
    <PageShell>
      <PageToolbar
        // A hardcoded trail makes PageToolbar discard the contextual one, which
        // flattened report → student → case down to its immediate parent. As a
        // parent crumb it only fills in when there is no trail to inherit.
        parentBreadcrumb={{ label: returnLabel, to: returnTo }}
        icon={FileText}
        navigation={
          <NavButton
            className="w-36"
            icon={ArrowLeft}
            to={returnTo}
            variant="outline"
          >
            ย้อนกลับ
          </NavButton>
        }
        actions={
          caseRecord.student_id && can("students") ? (
            <NavButton
              className="w-36"
              contextual
              icon={PersonIcon}
              to={`/students/${caseRecord.student_id}`}
            >
              ข้อมูลนักเรียน
            </NavButton>
          ) : null
        }
        title="ติดตามนักเรียน"
      />

      <StudentTrackingCard
        avatar={
          <StudentAvatar
            className="size-28 shrink-0 text-3xl"
            name={caseRecord.student_name}
            photoUrl={caseRecord.student_photo_url}
          />
        }
        historyItems={historyItems}
        name={caseRecord.student_name}
        noteLabel="เหตุผลที่เปิดเคส"
        noteValue={caseRecord.reason_flagged || ""}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setMapOpen(true)}
        schoolLine={`${caseRecord.student_school || "ไม่ระบุโรงเรียน"}${
          caseRecord.grade || caseRecord.room
            ? ` · ${[caseRecord.grade, caseRecord.room ? formatRoomLabel(caseRecord.room) : null].filter(Boolean).join(" ")}`
            : ""
        }`}
      />

      {/* What teachers saw before and during this case, read-only. Only here,
          not on the shared tracking card, because the token-link pages use
          that card and must not show observations. Same permission as the
          student page that already lists them. */}
      {caseRecord.student_id && can("students") ? (
        <Card className="mb-5 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MessageSquareText className="size-5 text-ink" aria-hidden="true" />
            ข้อสังเกตจากครู
          </h2>
          <div className="mt-4 max-h-[28rem] overflow-y-auto overscroll-contain pr-1">
            <StudentObservationHistory studentId={caseRecord.student_id} />
          </div>
        </Card>
      ) : null}

      <CaseTrackingTimeline
        caseRecord={caseRecord}
        onAssigned={() => void detailQuery.refetch()}
        onReview={(action) => setReviewAction(action)}
      />

      <Dialog onOpenChange={setContactsOpen} open={contactsOpen}>
        <DialogContent
          className="max-w-lg"
          onClose={() => setContactsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle icon={PhoneCall}>ช่องทางติดต่อนักเรียน</DialogTitle>
          </DialogHeader>
          {caseRecord.student_phone ? (
            <a
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-primary"
              href={`tel:${caseRecord.student_phone.replace(/[^\d+]/g, "")}`}
            >
              {caseRecord.student_phone}
              <PhoneCall className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              ยังไม่มีเบอร์ติดต่อในข้อมูลนักเรียน
            </p>
          )}
        </DialogContent>
      </Dialog>

      <HomeLocationDialog
        location={{
          address: caseRecord.home_address ?? caseRecord.student_address,
          province: caseRecord.home_province,
          district: caseRecord.home_district,
          subDistrict: caseRecord.home_sub_district,
          postalCode: caseRecord.home_postal_code,
          lat: caseRecord.student_lat,
          lng: caseRecord.student_lng,
          isApproximate: caseRecord.is_approximate_home_location,
        }}
        name={caseRecord.student_name}
        onOpenChange={setMapOpen}
        open={mapOpen}
      />

      <CaseStatusUpdateDialog
        caseRecord={caseRecord}
        onOpenChange={(open) => {
          if (!open) setReviewAction(null);
        }}
        onUpdated={() => void detailQuery.refetch()}
        open={reviewAction !== null}
        presetAction={reviewAction}
      />
    </PageShell>
  );
}
