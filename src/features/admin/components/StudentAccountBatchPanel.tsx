import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  ListChecks,
  Play,
  Rocket,
  SkipForward,
  XCircle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  FormErrorAlert,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  ProgressBar,
  SkeletonTable,
  SummaryMetrics,
  TableActionBar,
} from "../../../components/layout/page-primitives";
import { LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  useCancelStudentAccountBatch,
  useDownloadStudentAccountBatchCredentials,
  useEnqueueStudentAccountBatch,
  useResumeStudentAccountBatch,
  useStudentAccountBatch,
  useStudentAccountBatches,
} from "../hooks/useUsers";
import type {
  StudentAccountBatchJob,
  StudentAccountBatchJobStatus,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";

const ACTIVE_STATUSES: ReadonlySet<StudentAccountBatchJobStatus> = new Set(["PENDING", "RUNNING"]);
const RESUMABLE_STATUSES: ReadonlySet<StudentAccountBatchJobStatus> = new Set([
  "INTERRUPTED",
  "FAILED",
]);

function jobProgressPercent(job: StudentAccountBatchJob): number {
  if (job.status === "COMPLETED") {
    return 100;
  }
  if (job.totalCandidates <= 0) {
    return job.status === "CANCELED" || job.status === "FAILED" ? 100 : 0;
  }
  return Math.min(100, Math.round((job.processedCount / job.totalCandidates) * 100));
}

function scopeLabel(scope: StudentAccountBatchJob["scope"]): string {
  const parts = [
    scope.province,
    scope.district,
    scope.subDistrict,
    // Fall back to the raw ID only if the school was deleted after the job
    // ran (name lookup came back null) — never show the ID when a name
    // is available, to stay consistent with how schools are shown elsewhere.
    scope.schoolName ?? (scope.schoolId ? `รร. ${scope.schoolId}` : null),
    scope.grade,
    typeof scope.room === "number" ? `ห้อง ${scope.room}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "ทุกโรงเรียนในขอบเขต";
}

function credentialsToRows(credentials: StudentAccountCredential[]): string[][] {
  return credentials.map((credential) => [
    credential.studentName ?? "-",
    credential.username,
    credential.tempPassword,
    credential.schoolName ?? "-",
    credential.grade ?? "-",
    String(credential.room ?? "-"),
  ]);
}

const CREDENTIAL_HEADER = ["ชื่อ", "username", "รหัสชั่วคราว", "โรงเรียน", "ชั้น", "ห้อง"];

// Backend caps a single fetch at 200 rows — download loops this chunk size
// across every page so one click always yields the full, merged credential list.
const CREDENTIAL_FETCH_CHUNK_SIZE = 200;

interface StudentAccountBatchPanelProps {
  filter: StudentAccountFilter;
  initialSelectedJobId?: string | null;
  startRequestKey?: number;
}

export function StudentAccountBatchPanel({
  filter,
  initialSelectedJobId = null,
  startRequestKey = 0,
}: StudentAccountBatchPanelProps) {
  const statusCatalog = useStatusCatalog("STUDENT_ACCOUNT_BATCH_JOB");
  const { confirm, dialog: confirmDialog } = useConfirm();
  const handledStartRequestKey = useRef(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialSelectedJobId);
  const [credentials, setCredentials] = useState<StudentAccountCredential[]>([]);
  const [isDownloadingCredentials, setIsDownloadingCredentials] = useState(false);

  const listQuery = useStudentAccountBatches();
  const detailQuery = useStudentAccountBatch(selectedJobId);
  const jobs = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const selectedJob = useMemo(
    () => detailQuery.data?.data ?? jobs.find((job) => job.id === selectedJobId) ?? null,
    [detailQuery.data, jobs, selectedJobId],
  );

  const resetCredentialState = () => {
    setCredentials([]);
  };

  const handleSelectJob = (id: string) => {
    if (id !== selectedJobId) {
      resetCredentialState();
    }
    setSelectedJobId(id);
  };

  const enqueueMutation = useEnqueueStudentAccountBatch();
  const resumeMutation = useResumeStudentAccountBatch();
  const cancelMutation = useCancelStudentAccountBatch();
  const credentialsMutation = useDownloadStudentAccountBatchCredentials();

  const handleEnqueue = useCallback(async () => {
    const ok = await confirm({
      title: "สร้างบัญชีนักเรียนทั้งหมดในขอบเขตนี้",
      description:
        "ระบบจะสร้างบัญชีของนักเรียนที่ยังไม่มีบัญชีทั้งหมดในขอบเขตที่เลือกแบบเบื้องหลัง " +
        "รหัสชั่วคราวจะออกให้ตอนกด “ดาวน์โหลดรหัส” เท่านั้น",
      confirmText: "เริ่มงาน",
    });
    if (!ok) {
      return;
    }
    const result = await enqueueMutation.mutateAsync({ ...filter, onlyWithoutAccount: true });
    setSelectedJobId(result.data.id);
    resetCredentialState();
  }, [confirm, enqueueMutation, filter]);

  useEffect(() => {
    if (startRequestKey <= 0 || startRequestKey === handledStartRequestKey.current) {
      return;
    }
    handledStartRequestKey.current = startRequestKey;
    void handleEnqueue();
  }, [handleEnqueue, startRequestKey]);

  const handleResume = (id: string) => {
    resumeMutation.mutate(id);
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: "ยกเลิกงานสร้างบัญชี",
      description: "บัญชีที่สร้างไปแล้วจะยังอยู่ ระบบจะหยุดสร้างบัญชีที่เหลือ",
      confirmText: "ยกเลิกงาน",
      variant: "destructive",
    });
    if (ok) {
      cancelMutation.mutate(id);
    }
  };

  const handleDownloadCredentials = async (id: string) => {
    setIsDownloadingCredentials(true);
    try {
      const first = await credentialsMutation.mutateAsync({
        id,
        page: 1,
        limit: CREDENTIAL_FETCH_CHUNK_SIZE,
      });
      const allCredentials = [...first.credentials];
      const totalPages = Math.max(1, Math.ceil(first.meta.total / CREDENTIAL_FETCH_CHUNK_SIZE));
      for (let page = 2; page <= totalPages; page += 1) {
        const next = await credentialsMutation.mutateAsync({
          id,
          page,
          limit: CREDENTIAL_FETCH_CHUNK_SIZE,
        });
        allCredentials.push(...next.credentials);
      }
      setCredentials(allCredentials);
    } catch {
      // Surfaced via credentialsMutation.error (FormErrorAlert above); swallow
      // here so the void'd click handler doesn't raise an unhandled rejection.
      // A mid-loop failure means earlier pages were already rotated server-side
      // with nothing shown — show no partial sheet; re-clicking rotates and
      // downloads the full set again.
      setCredentials([]);
    } finally {
      setIsDownloadingCredentials(false);
    }
  };

  const copyCredentials = async () => {
    const rows = [CREDENTIAL_HEADER, ...credentialsToRows(credentials)];
    await navigator.clipboard.writeText(rows.map((row) => row.join("\t")).join("\n"));
  };

  const exportCredentials = () => {
    const rows = [CREDENTIAL_HEADER, ...credentialsToRows(credentials)];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `student-credentials-${selectedJobId ?? "batch"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {confirmDialog}
      <Alert>
        <AlertTitle>งานสร้างบัญชีนักเรียนเบื้องหลัง</AlertTitle>
        <AlertDescription>
          กด “สร้างบัญชี” ด้านบนเพื่อเริ่มงาน — งานทำต่อเนื่องแม้ปิดหน้านี้ ทำต่อได้ถ้าสะดุด
          และดึงรหัสชั่วคราวไปพิมพ์แจกได้ภายหลัง{enqueueMutation.isPending ? " กำลังเริ่มงาน…" : ""}
        </AlertDescription>
      </Alert>

      <FormErrorAlert error={enqueueMutation.error} fallback="เริ่มงานสร้างบัญชีไม่สำเร็จ" />
      <FormErrorAlert error={resumeMutation.error} fallback="สั่งทำงานต่อไม่สำเร็จ" />
      <FormErrorAlert error={cancelMutation.error} fallback="ยกเลิกงานไม่สำเร็จ" />
      <FormErrorAlert error={credentialsMutation.error} fallback="ดึงรหัสชั่วคราวไม่สำเร็จ" />

      {listQuery.isError || statusCatalog.isError ? (
        <ErrorState
          title="โหลดรายการงานไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดงานสร้างบัญชีแบบชุด"
          onRetry={() => {
            void listQuery.refetch();
            statusCatalog.refetch();
          }}
        />
      ) : listQuery.isLoading || statusCatalog.isLoading ? (
        <SkeletonTable rows={3} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="ยังไม่มีงานสร้างบัญชีแบบชุด"
          description="เลือกขอบเขตด้านบนแล้วกด “สร้างบัญชี” เพื่อเริ่มงานแรก"
        />
      ) : (
        <DataTable
          headings={[
            { label: "เริ่มเมื่อ" },
            { label: "ขอบเขต" },
            { label: "สถานะ" },
            { label: "ความคืบหน้า" },
            { label: "" },
          ]}
          minWidthClassName="min-w-[900px]"
        >
          {jobs.map((job) => {
            const meta = findStatusCatalogItem(statusCatalog.items, job.status);
            return (
              <DataTableRow
                key={job.id}
                className={job.id === selectedJobId ? "bg-primary-50/60" : undefined}
              >
                <DataTableCell className="text-slate-600">
                  {formatThaiDateTime(job.createdAt)}
                </DataTableCell>
                <DataTableCell className="text-slate-700">{scopeLabel(job.scope)}</DataTableCell>
                <DataTableCell>
                  <Badge variant={meta?.badgeVariant ?? "secondary"}>
                    {meta?.label ?? job.status}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="min-w-[180px]">
                  <ProgressBar
                    value={jobProgressPercent(job)}
                    label={`${job.processedCount}/${job.totalCandidates}`}
                  />
                </DataTableCell>
                <DataTableCell>
                  <TableActionBar className="min-h-0 justify-end">
                    <Button
                      icon={Eye}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectJob(job.id)}
                    >
                      ดูรายละเอียด
                    </Button>
                    {RESUMABLE_STATUSES.has(job.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Play}
                        onClick={() => handleResume(job.id)}
                        disabled={resumeMutation.isPending}
                      >
                        ทำต่อ
                      </Button>
                    ) : null}
                    {ACTIVE_STATUSES.has(job.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={XCircle}
                        onClick={() => void handleCancel(job.id)}
                        disabled={cancelMutation.isPending}
                      >
                        ยกเลิก
                      </Button>
                    ) : null}
                  </TableActionBar>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      )}

      {selectedJob ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">รายละเอียดงาน</span>
              <Badge
                variant={
                  findStatusCatalogItem(statusCatalog.items, selectedJob.status)
                    ?.badgeVariant ?? "secondary"
                }
              >
                {findStatusCatalogItem(statusCatalog.items, selectedJob.status)?.label ??
                  selectedJob.status}
              </Badge>
            </div>
            <RefreshButton onRefresh={() => listQuery.refetch()} />
          </div>

          <ProgressBar
            value={jobProgressPercent(selectedJob)}
            label={`ดำเนินการ ${selectedJob.processedCount}/${selectedJob.totalCandidates}`}
          />

          <SummaryMetrics
            columns={4}
            items={[
              { label: "ทั้งหมด", value: selectedJob.totalCandidates, tone: "default", icon: ListChecks, emphasis: true },
              { label: "สร้างสำเร็จ", value: selectedJob.createdCount, tone: "success", icon: CheckCircle2 },
              { label: "ข้าม", value: selectedJob.skippedCount, tone: "info", icon: SkipForward },
              { label: "ล้มเหลว", value: selectedJob.failedCount, tone: "danger", icon: XCircle },
            ]}
          />

          {selectedJob.errorSummary ? (
            <Alert variant="destructive">
              <AlertTitle>งานหยุดเพราะข้อผิดพลาด</AlertTitle>
              <AlertDescription>{selectedJob.errorSummary}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2 text-sm text-slate-500">
            <span>เริ่ม: {formatThaiDateTime(selectedJob.startedAt) || "-"}</span>
            <span>·</span>
            <span>เสร็จ: {formatThaiDateTime(selectedJob.finishedAt) || "-"}</span>
          </div>

          <TableActionBar>
            {RESUMABLE_STATUSES.has(selectedJob.status) ? (
              <Button
                icon={Play}
                variant="outline"
                onClick={() => handleResume(selectedJob.id)}
                disabled={resumeMutation.isPending}
              >
                ทำงานต่อ
              </Button>
            ) : null}
            {ACTIVE_STATUSES.has(selectedJob.status) ? (
              <Button
                icon={XCircle}
                variant="outline"
                onClick={() => void handleCancel(selectedJob.id)}
                disabled={cancelMutation.isPending}
              >
                ยกเลิกงาน
              </Button>
            ) : null}
            <Button
              icon={Download}
              onClick={() => void handleDownloadCredentials(selectedJob.id)}
              disabled={isDownloadingCredentials || selectedJob.createdCount === 0}
            >
              {isDownloadingCredentials ? "กำลังออกรหัส..." : "ดาวน์โหลดรหัสชั่วคราว"}
            </Button>
          </TableActionBar>

          {credentials.length > 0 ? (
            <div className="space-y-3">
              <Alert variant="success">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>ออกรหัสชั่วคราวแล้ว {credentials.length} บัญชี (รวมทุกหน้า)</AlertTitle>
                    <AlertDescription>
                      รหัสแสดงครั้งเดียว ดาวน์โหลดซ้ำจะออกรหัสใหม่และยกเลิกใบเดิม
                    </AlertDescription>
                  </div>
                  <TableActionBar className="min-h-0 shrink-0">
                    <Button icon={Copy} variant="outline" onClick={() => void copyCredentials()}>
                      คัดลอกตาราง
                    </Button>
                    <Button icon={Download} variant="outline" onClick={() => void exportCredentials()}>
                      ส่งออก CSV
                    </Button>
                  </TableActionBar>
                </div>
              </Alert>
              <DataTable
                headings={[
                  { label: "ชื่อ" },
                  { label: "username" },
                  { label: "รหัสชั่วคราว" },
                  { label: "โรงเรียน" },
                  { label: "ช่วงเวลา" },
                ]}
                minWidthClassName="min-w-[820px]"
              >
                {credentials.map((credential) => (
                  <DataTableRow key={credential.userId}>
                    <DataTableCell className="font-bold text-slate-800">
                      {credential.studentName ?? "-"}
                    </DataTableCell>
                    <DataTableCell className="font-mono text-slate-700">
                      {credential.username}
                    </DataTableCell>
                    <DataTableCell className="font-mono font-bold text-slate-900">
                      {credential.tempPassword}
                    </DataTableCell>
                    <DataTableCell className="text-slate-600">
                      {credential.schoolName ?? "-"} · {credential.grade ?? "-"} /{" "}
                      {credential.room ?? "-"}
                    </DataTableCell>
                    <DataTableCell>
                      <LinkTimeSummary
                        expiresAt={credential.temporaryPasswordExpiresAt}
                        startsAt={credential.temporaryPasswordIssuedAt}
                        variant="columns"
                      />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
              <TableCardList>
                {credentials.map((credential) => (
                  <TableCard key={credential.userId} className="space-y-2">
                    <div className="font-bold text-slate-900">{credential.studentName ?? "-"}</div>
                    <div className="grid gap-1 text-sm">
                      <span className="font-mono text-slate-700">{credential.username}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {credential.tempPassword}
                      </span>
                    </div>
                    <LinkTimeSummary
                      expiresAt={credential.temporaryPasswordExpiresAt}
                      startsAt={credential.temporaryPasswordIssuedAt}
                    />
                  </TableCard>
                ))}
              </TableCardList>
            </div>
          ) : selectedJob.createdCount > 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-success-500" />
              สร้างบัญชีแล้ว {selectedJob.createdCount} รายการ — กด “ดาวน์โหลดรหัสชั่วคราว” เพื่อออกรหัสไปแจก
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
