import { useState } from "react";
import { ArrowLeft, FileText, MapPin, PhoneCall } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, Dialog, DialogContent, DialogHeader, DialogTitle, PersonIcon } from "../../../components/base";
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
import { formatRoomLabel } from "../../../lib/room-presentation";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTrackingTimeline } from "../components/CaseTrackingTimeline";
import { useCaseDetail } from "../hooks/useCaseDetail";
import type { CaseReviewAction } from "../types/cases.types";
import { VisitMapPreview } from "../../tasks/components/VisitMapPreview";

export function CaseDetailPage() {
  const safeBackTarget = useSafeBackTarget();
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = Number(caseIdParam);
  const [reviewAction, setReviewAction] = useState<CaseReviewAction | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const detailQuery = useCaseDetail(Number.isInteger(caseId) && caseId > 0 ? caseId : undefined);
  const caseRecord = detailQuery.data?.data;
  const returnTo =
    typeof safeBackTarget === "string" && safeBackTarget !== "/"
      ? safeBackTarget
      : "/student-risk-report/risk";
  const returnLabel = getNavigationLabel(returnTo);

  if (detailQuery.isLoading) {
    return <PageShell><Card className="p-5"><SkeletonStack lines={5} /></Card></PageShell>;
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
          action={<NavButton to={-1} variant="outline">ย้อนกลับ</NavButton>}
          description="เคสนี้อาจอยู่นอกขอบเขตข้อมูลของคุณหรือถูกนำออกแล้ว"
          icon={FileText}
          title="ไม่พบเคส"
        />
      </PageShell>
    );
  }

  const historyItems = (caseRecord.follow_up_rounds ?? [])
    .filter((round) => round.submitted_at)
    .map((round) => ({
      id: round.task_id,
      assignee: round.initial_assignee || "-",
      note: round.assignment_note || "-",
      at: round.submitted_at!,
    }))
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  return (
    <PageShell>
      <PageToolbar
        breadcrumbTrail={[
          { label: "หน้าหลัก", to: "/" },
          { label: returnLabel, to: returnTo },
        ]}
        icon={FileText}
        navigation={<NavButton className="w-36" icon={ArrowLeft} to={returnTo} variant="outline">ย้อนกลับ</NavButton>}
        actions={caseRecord.student_id ? (
          <NavButton
            className="w-36"
            contextual
            icon={PersonIcon}
            to={`/students/${caseRecord.student_id}`}
          >
            ข้อมูลนักเรียน
          </NavButton>
        ) : null}
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
        historyItems={historyItems.map((item) => ({
          ...item,
          reason: caseRecord.reason_flagged || "-",
        }))}
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

      <CaseTrackingTimeline
        caseRecord={caseRecord}
        onAssigned={() => void detailQuery.refetch()}
        onReview={(action) => setReviewAction(action)}
      />

      <Dialog onOpenChange={setContactsOpen} open={contactsOpen}>
        <DialogContent className="max-w-lg" onClose={() => setContactsOpen(false)}>
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

      <Dialog onOpenChange={setMapOpen} open={mapOpen}>
        <DialogContent className="max-w-5xl" onClose={() => setMapOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={MapPin}>พิกัดบ้านนักเรียน</DialogTitle>
          </DialogHeader>
          <VisitMapPreview
            address={caseRecord.student_address}
            className="border-0 p-0"
            lat={caseRecord.student_lat}
            lng={caseRecord.student_lng}
            mapClassName="min-h-[60vh]"
            markerLabel={caseRecord.student_name}
            title={caseRecord.student_name}
          />
        </DialogContent>
      </Dialog>

      <CaseStatusUpdateDialog
        caseRecord={caseRecord}
        onOpenChange={(open) => { if (!open) setReviewAction(null); }}
        onUpdated={() => void detailQuery.refetch()}
        open={reviewAction !== null}
        presetAction={reviewAction}
      />
    </PageShell>
  );
}
