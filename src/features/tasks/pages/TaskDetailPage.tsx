import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, SquarePen } from "lucide-react";
import { Badge, Button, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseReferralOutcomeDialog } from "../../cases/components/CaseReferralOutcomeDialog";
import { CaseReviewActionButton } from "../../cases/components/CaseReviewActionButton";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { CaseStatusUpdateDialog } from "../../cases/components/CaseStatusUpdateDialog";
import {
  canUpdateReferralOutcome,
  getAgencyTypeLabel,
  getReferralStatusLabel,
} from "../../cases/lib/case-referral-presentation";
import type { CaseReferralRecord, CaseRecord } from "../../cases/types/cases.types";
import { taskService } from "../api/task.service";
import {
  formatDateTime,
  getStatusLabel,
  getTaskTypeLabel,
  normalizeTaskPublicLink,
} from "../lib/task-presentation";
import { VisitMapPreview } from "../components/VisitMapPreview";

function ReferralCard({
  canUpdate,
  onUpdate,
  referral,
}: {
  canUpdate: boolean;
  onUpdate: (referral: CaseReferralRecord) => void;
  referral: CaseReferralRecord;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            {referral.agency_name_snapshot}
          </div>
          <div className="text-sm text-slate-500">
            {getAgencyTypeLabel(referral.agency_type_snapshot)}
            {referral.contact_person ? ` · ${referral.contact_person}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">{getReferralStatusLabel(referral.status)}</Badge>
          {canUpdate ? (
            <Button
              icon={SquarePen}
              onClick={() => onUpdate(referral)}
              size="sm"
              variant="outline"
            >
              บันทึกผลตอบรับ
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>ส่งโดย {referral.referred_by_label || "-"}</div>
        <div>ส่งเมื่อ {formatDateTime(referral.referred_at)}</div>
        <div>{referral.phone || "-"}</div>
        <div>{referral.address || "-"}</div>
      </div>
      {referral.referral_note ? (
        <div className="mt-3 text-sm font-medium text-slate-700">
          {referral.referral_note}
        </div>
      ) : null}
      {referral.outcome ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">ผลตอบรับ</div>
          <div>{referral.outcome}</div>
          {referral.responded_at ? (
            <div className="mt-1 text-xs text-slate-500">
              อัปเดตเมื่อ {formatDateTime(referral.responded_at)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { can } = usePermissions();
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<CaseReferralRecord | null>(null);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const taskQuery = useQuery({
    queryKey: ["task-chain", taskId],
    queryFn: () => taskService.getTaskChain(taskId || ""),
    enabled: Boolean(taskId),
  });
  const taskData = taskQuery.data;
  const caseRecord = useMemo<CaseRecord | null>(() => {
    if (!taskData?.case_id) {
      return null;
    }

    return {
      id: taskData.case_id,
      student_name: taskData.student_name || "-",
      student_school: taskData.student_school || null,
      student_address: taskData.student_address || null,
      reason_flagged: taskData.reason_flagged || null,
      status: taskData.case_status || "OPEN",
      created_at: "",
      task_id: taskData.task_id,
    };
  }, [taskData]);
  const canUpdateCase = Boolean(caseRecord) && can("review-cases");
  const canUpdateReferral =
    Boolean(caseRecord) && can("review-cases") && can("forward-case");

  function openReferralOutcome(referral: CaseReferralRecord): void {
    setSelectedReferral(referral);
    setReferralDialogOpen(true);
  }

  if (taskQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่สามารถโหลดรายละเอียดภารกิจได้"
          onRetry={() => void taskQuery.refetch()}
        />
      </PageShell>
    );
  }

  const task = taskQuery.data;
  const firstSubmission = task.chain.find((link) => link.submission)?.submission;
  const referrals = task.referrals ?? [];
  // Only the current active link in the chain can be opened/closed by an admin.
  const activeLink = task.chain.find((link) => link.status === "ACTIVE");

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardList}
        title="รายละเอียดภารกิจ"
        description={task.task_id}
        actions={
          <div className="flex flex-nowrap items-center gap-3">
            {canUpdateCase ? (
              <CaseReviewActionButton
                onClick={() => setCaseDialogOpen(true)}
                size="md"
              >
                ดำเนินการเคส
              </CaseReviewActionButton>
            ) : null}
            {activeLink ? (
              <LinkLockToggleButton
                linkId={String(activeLink.id)}
                locked={activeLink.admin_locked ?? 0}
                invalidateKeys={[["task-chain", taskId]]}
              />
            ) : null}
            <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
              ย้อนกลับ
            </Button>
          </div>
        }
      />
      <div className="space-y-5">

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลภารกิจ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">ประเภท</div>
              <div className="font-bold">{getTaskTypeLabel(task.task_type)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">สถานะ</div>
              {task.case_status ? (
                <CaseStatusBadge status={task.case_status} />
              ) : (
                <Badge variant="secondary">{getStatusLabel(task.task_status)}</Badge>
              )}
            </div>
            <div>
              <div className="text-sm text-slate-500">นักเรียน</div>
              <div className="font-bold">{task.student_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">โรงเรียน / ชั้น</div>
              <div className="font-bold">
                {task.student_school || task.target_grade || "-"} {task.target_room || ""}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm text-slate-500">สาเหตุ / สรุปผล</div>
              <div className="font-medium text-slate-700">
                {task.reason_flagged || task.result_summary || "-"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">เส้นทางการมอบหมาย</h2>
          <div className="space-y-3">
            {task.chain.map((link, index) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-4"
                key={link.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-slate-900">
                      {index + 1}. {link.assigned_to_name || "ไม่ระบุผู้รับ"}
                    </div>
                    <div className="text-sm text-slate-500">
                      สร้างเมื่อ {formatDateTime(link.created_at)}
                    </div>
                  </div>
                  <Badge variant={link.status === "COMPLETED" ? "success" : "secondary"}>
                    {getStatusLabel(link.status)}
                  </Badge>
                </div>
                {link.magic_link ? (
                  <LinkShareActions
                    className="mt-3"
                    link={normalizeTaskPublicLink(link.magic_link)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        {firstSubmission ? (
          <Card className="rounded-lg p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลรายงานการลงพื้นที่</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">ประเภทสาเหตุ</div>
                <div className="font-bold">{firstSubmission.cause_category || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">ส่งเมื่อ</div>
                <div className="font-bold">{formatDateTime(firstSubmission.submitted_at)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm text-slate-500">รายละเอียด</div>
                <div className="font-medium text-slate-700">
                  {firstSubmission.cause_detail || "-"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm text-slate-500">ข้อเสนอแนะ</div>
                <div className="font-medium text-slate-700">
                  {firstSubmission.recommendation || "-"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <VisitMapPreview
                  emptyDescription="รายงานนี้ยังไม่มีพิกัดหน้างาน"
                  lat={firstSubmission.visit_lat}
                  lng={firstSubmission.visit_lng}
                  markerLabel="หน้างาน"
                  title="แผนที่พิกัดหน้างาน"
                />
              </div>
            </div>
          </Card>
        ) : null}

        {referrals.length > 0 ? (
          <Card className="rounded-lg p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">ประวัติการส่งต่อ</h2>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <ReferralCard
                  canUpdate={
                    canUpdateReferral && canUpdateReferralOutcome(referral.status)
                  }
                  key={referral.id}
                  onUpdate={openReferralOutcome}
                  referral={referral}
                />
              ))}
            </div>
          </Card>
        ) : null}
      </div>
      <CaseStatusUpdateDialog
        key={caseRecord?.id ?? "none"}
        caseRecord={caseRecord}
        onOpenChange={setCaseDialogOpen}
        onUpdated={() => void taskQuery.refetch()}
        open={caseDialogOpen}
      />
      <CaseReferralOutcomeDialog
        caseId={caseRecord?.id ?? null}
        key={`${selectedReferral?.id ?? "none"}-${referralDialogOpen ? "open" : "closed"}`}
        onOpenChange={setReferralDialogOpen}
        onUpdated={() => void taskQuery.refetch()}
        open={referralDialogOpen}
        referral={selectedReferral}
      />
    </PageShell>
  );
}
