import { useState } from "react";
import { ArrowLeft, ClipboardCheck, Eye, HeartHandshake, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseStatusBadge } from "../components/CaseStatusBadge";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { useCaseDetail } from "../hooks/useCaseDetail";

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export function CaseDetailPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = Number(caseIdParam);
  const [reviewOpen, setReviewOpen] = useState(false);
  const detailQuery = useCaseDetail(Number.isInteger(caseId) && caseId > 0 ? caseId : undefined);
  const caseRecord = detailQuery.data?.data;

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-5"><SkeletonStack lines={5} /></Card>
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
          action={<NavButton to={-1} variant="outline">ย้อนกลับ</NavButton>}
          icon={HeartHandshake}
          title="ไม่พบเคส"
          description="เคสนี้อาจอยู่นอกขอบเขตข้อมูลของคุณหรือถูกนำออกแล้ว"
        />
      </PageShell>
    );
  }

  const visitPrefill = {
    existing_case_id: String(caseRecord.id),
    student_id: caseRecord.student_id ?? null,
    student_name: caseRecord.student_name,
    student_school: caseRecord.student_school ?? null,
    student_address: caseRecord.student_address ?? null,
    reason_flagged: caseRecord.reason_flagged ?? null,
  };

  return (
    <PageShell>
      <PageToolbar
        description="ตรวจสอบสาเหตุและดำเนินการติดตามนักเรียนจากเคสนี้"
        footerActions={
          <>
            {!caseRecord.task_id && can("create") ? (
              <Button
                icon={Plus}
                onClick={() => void navigate("/create/visit", { state: { prefill: visitPrefill } })}
              >
                สร้างลิงก์ลงพื้นที่
              </Button>
            ) : caseRecord.task_id ? (
              <NavButton icon={Eye} to={`/tasks/${caseRecord.task_id}`} variant="outline">
                ดูภารกิจ
              </NavButton>
            ) : null}
            {can("review-cases") &&
            (caseRecord.status === "PENDING_REVIEW" || caseRecord.status === "IN_PROGRESS") ? (
              <Button icon={ClipboardCheck} onClick={() => setReviewOpen(true)}>
                ดำเนินการเคส
              </Button>
            ) : null}
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </>
        }
        icon={HeartHandshake}
        title="รายละเอียดเคส"
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{caseRecord.student_name}</h2>
            <p className="mt-1 text-sm text-slate-500">{caseRecord.student_school || "ไม่ระบุโรงเรียน"}</p>
          </div>
          <CaseStatusBadge
            badgeVariant={caseRecord.status_badge_variant}
            label={caseRecord.status_label}
            status={caseRecord.status}
          />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="ชั้น" value={caseRecord.grade} />
          <DetailItem label="ห้อง" value={caseRecord.room ? `ห้อง ${caseRecord.room}` : null} />
          <DetailItem label="วันที่เปิดเคส" value={formatThaiDate(caseRecord.created_at)} />
          <DetailItem label="รหัสเคส" value={String(caseRecord.id)} />
        </dl>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="text-base font-bold text-slate-800">เหตุผลที่เปิดเคส</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {caseRecord.reason_flagged || "ไม่ระบุเหตุผล"}
        </p>
      </Card>

      {caseRecord.student_id ? (
        <div className="flex justify-end">
          <NavButton icon={Eye} to={`/students/${caseRecord.student_id}`} variant="outline">
            ดูข้อมูลนักเรียน
          </NavButton>
        </div>
      ) : null}

      <CaseStatusUpdateDialog
        caseRecord={caseRecord}
        onOpenChange={setReviewOpen}
        onUpdated={() => void detailQuery.refetch()}
        open={reviewOpen}
      />
    </PageShell>
  );
}
