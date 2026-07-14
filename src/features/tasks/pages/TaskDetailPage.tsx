import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { Badge, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { NavButton } from "../../../components/layout/nav-button";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseReviewActionButton } from "../../cases/components/CaseReviewActionButton";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { CaseStatusUpdateDialog } from "../../cases/components/CaseStatusUpdateDialog";
import type { CaseRecord, CaseReportUpRecord } from "../../cases/types/cases.types";
import { taskService } from "../api/task.service";
import {
  formatDateTime,
  getStatusLabel,
  getTaskLinkDisplayStatus,
  getTaskTypeLabel,
  normalizeTaskPublicLink,
} from "../lib/task-presentation";
import { VisitMapPreview } from "../components/VisitMapPreview";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
function ReportUpCard({ reportUp }: { reportUp: CaseReportUpRecord }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-bold text-slate-900">รายงานขึ้นส่วนกลาง</div>
          <div className="text-sm text-slate-500">
            {reportUp.school_name_snapshot || "ไม่ระบุโรงเรียน"}
            {reportUp.province_snapshot ? ` · ${reportUp.province_snapshot}` : ""}
          </div>
        </div>
        <Badge variant="destructive">รายงานแล้ว</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>รายงานโดย {reportUp.reported_by_label || "-"}</div>
        <div>รายงานเมื่อ {formatDateTime(reportUp.reported_at)}</div>
      </div>
      {reportUp.report_reason ? (
        <div className="mt-3 text-sm font-medium text-slate-700">
          {reportUp.report_reason}
        </div>
      ) : null}
      {reportUp.report_summary ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">สรุปสำหรับส่วนกลาง</div>
          <div>{reportUp.report_summary}</div>
        </div>
      ) : null}
    </div>
  );
}

export function TaskDetailPage() {
  const caseStatusCatalog = useStatusCatalog("CASE_WORKFLOW").items;
  const taskStatusCatalog = useStatusCatalog("TASK_WORKFLOW").items;
  const linkDisplayCatalog = useStatusCatalog("TASK_LINK_STATE").items;
  const linkStatusCatalog = useStatusCatalog("TASK_LINK_STATUS").items;
  const { taskId } = useParams<{ taskId: string }>();
  const { can } = usePermissions();
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
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
  const canViewAuditLog = Boolean(caseRecord) && can("audit-log");

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
  const reportUps = task.reportUps ?? [];
  // Only the current active link in the chain can be opened/closed by an admin.
  const activeLink = task.chain.find(
    (link) =>
      getTaskLinkDisplayStatus(link, linkDisplayCatalog, linkStatusCatalog).state === "ACTIVE",
  );
  const caseStatus = findStatusCatalogItem(caseStatusCatalog, task.case_status);
  const taskStatus = findStatusCatalogItem(taskStatusCatalog, task.task_status);

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
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
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
                <CaseStatusBadge
                  badgeVariant={caseStatus?.badgeVariant}
                  label={caseStatus?.label}
                  status={task.case_status}
                />
              ) : (
                <Badge variant={taskStatus?.badgeVariant ?? "secondary"}>
                  {getStatusLabel(task.task_status, taskStatusCatalog)}
                </Badge>
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
          <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-slate-200">
            {task.chain.map((link, index) => {
              const linkStatus = getTaskLinkDisplayStatus(
                link,
                linkDisplayCatalog,
                linkStatusCatalog,
              );
              return (
                <li
                  className="relative min-w-0 border-b border-slate-100 py-4 pl-9 last:border-b-0"
                  key={link.id}
                >
                  <span className="absolute left-0 top-5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white shadow-sm">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {index === 0 ? (
                        <div className="font-bold text-slate-900">
                          ผู้รับเริ่มต้น:{" "}
                          {link.assigned_to_name || "ไม่ระบุผู้รับ"}
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-2 font-bold text-slate-900">
                          <span className="break-words">
                            {link.delegated_by_name || "ไม่ระบุผู้ส่ง"}
                          </span>
                          <ArrowRight
                            className="size-4 shrink-0 text-slate-500"
                            aria-hidden="true"
                          />
                          <span className="break-words">
                            {link.assigned_to_name || "ไม่ระบุผู้รับ"}
                          </span>
                        </div>
                      )}
                      {link.delegation_depth != null ? (
                        <div className="text-sm text-slate-500">
                          ลำดับที่ {Number(link.delegation_depth) + 1}
                        </div>
                      ) : null}
                      <LinkTimeSummary
                        className="mt-2 max-w-sm"
                        expiresAt={link.expires_at}
                        startLabel={index === 0 ? "เริ่ม" : "ส่งต่อ"}
                        startsAt={link.delegated_at || link.created_at}
                      />
                    </div>
                    <Badge variant={linkStatus.variant}>{linkStatus.label}</Badge>
                  </div>
                  {link.magic_link ? (
                    <LinkShareActions
                      className="mt-3"
                      link={normalizeTaskPublicLink(link.magic_link)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Card>

        {canViewAuditLog && caseRecord ? (
          <Card className="rounded-lg p-6">
            <AuditLogPanel
              caseId={caseRecord.id}
              description="ดูประวัติการช่วยเหลือ รายงานขึ้นส่วนกลาง และปิดเคสของรายการนี้"
              domain="cases"
              showReferenceColumn={false}
              title="ประวัติเคสนี้"
            />
          </Card>
        ) : null}

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

        {reportUps.length > 0 ? (
          <Card className="rounded-lg p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">ประวัติรายงานขึ้นส่วนกลาง</h2>
            <div className="space-y-3">
              {reportUps.map((reportUp) => (
                <ReportUpCard key={reportUp.id} reportUp={reportUp} />
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
    </PageShell>
  );
}
