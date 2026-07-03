import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Play,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  FormErrorAlert,
  Label,
  Select,
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
  SummaryMetrics,
  TableActionBar,
} from "../../../components/layout/page-primitives";
import { LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  useCancelStudentAccountBatch,
  useDownloadStudentAccountBatchCredentials,
  useEnqueueStudentAccountBatch,
  useResumeStudentAccountBatch,
  useStudentAccountBatches,
} from "../hooks/useUsers";
import type {
  StudentAccountBatchCredentialResponse,
  StudentAccountBatchJob,
  StudentAccountBatchJobStatus,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";

const STATUS_META: Record<
  StudentAccountBatchJobStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "รอเริ่ม", variant: "secondary" },
  RUNNING: { label: "กำลังทำงาน", variant: "default" },
  COMPLETED: { label: "เสร็จสิ้น", variant: "success" },
  FAILED: { label: "ล้มเหลว", variant: "destructive" },
  INTERRUPTED: { label: "หยุดชะงัก", variant: "warning" },
  CANCELED: { label: "ยกเลิกแล้ว", variant: "secondary" },
};

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
    scope.schoolId ? `รร. ${scope.schoolId}` : null,
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

const CREDENTIAL_LIMIT_OPTIONS = [50, 100, 200] as const;
const DEFAULT_CREDENTIAL_LIMIT = 100;

type CredentialMeta = StudentAccountBatchCredentialResponse["meta"];

export function StudentAccountBatchPanel({ filter }: { filter: StudentAccountFilter }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<StudentAccountCredential[]>([]);
  const [credentialMeta, setCredentialMeta] = useState<CredentialMeta | null>(null);
  const [credentialPage, setCredentialPage] = useState(1);
  const [credentialLimit, setCredentialLimit] = useState<number>(DEFAULT_CREDENTIAL_LIMIT);

  const listQuery = useStudentAccountBatches();
  const jobs = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const credentialPageCount = selectedJob
    ? Math.max(1, Math.ceil(selectedJob.createdCount / credentialLimit))
    : 1;

  const resetCredentialState = () => {
    setCredentials([]);
    setCredentialMeta(null);
    setCredentialPage(1);
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

  const handleEnqueue = async () => {
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
  };

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
    const result = await credentialsMutation.mutateAsync({
      id,
      page: credentialPage,
      limit: credentialLimit,
    });
    setCredentials(result.credentials);
    setCredentialMeta(result.meta);
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
    anchor.download = `student-credentials-${selectedJobId ?? "batch"}-p${
      credentialMeta?.page ?? credentialPage
    }.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {confirmDialog}
      <Alert>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <AlertTitle>สร้างบัญชีจำนวนมากแบบเบื้องหลัง</AlertTitle>
            <AlertDescription>
              เหมาะกับการสร้างทั้งโรงเรียน/เขตทีเดียว งานทำต่อเนื่องแม้ปิดหน้านี้ ทำต่อได้ถ้าสะดุด
              และดึงรหัสชั่วคราวไปพิมพ์แจกได้ภายหลัง
            </AlertDescription>
          </div>
          <Button
            icon={Rocket}
            onClick={() => void handleEnqueue()}
            disabled={enqueueMutation.isPending}
            className="shrink-0"
          >
            {enqueueMutation.isPending ? "กำลังเริ่ม..." : "สร้างทั้งหมดในขอบเขตนี้"}
          </Button>
        </div>
      </Alert>

      <FormErrorAlert error={enqueueMutation.error} fallback="เริ่มงานสร้างบัญชีไม่สำเร็จ" />
      <FormErrorAlert error={resumeMutation.error} fallback="สั่งทำงานต่อไม่สำเร็จ" />
      <FormErrorAlert error={cancelMutation.error} fallback="ยกเลิกงานไม่สำเร็จ" />
      <FormErrorAlert error={credentialsMutation.error} fallback="ดึงรหัสชั่วคราวไม่สำเร็จ" />

      {listQuery.isError ? (
        <ErrorState
          title="โหลดรายการงานไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดงานสร้างบัญชีแบบชุด"
          onRetry={() => void listQuery.refetch()}
        />
      ) : listQuery.isLoading ? (
        <EmptyState icon={Rocket} title="กำลังโหลดรายการงาน" />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="ยังไม่มีงานสร้างบัญชีแบบชุด"
          description="เลือกขอบเขตด้านบนแล้วกด “สร้างทั้งหมดในขอบเขตนี้” เพื่อเริ่มงานแรก"
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
            const meta = STATUS_META[job.status];
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
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </DataTableCell>
                <DataTableCell className="min-w-[180px]">
                  <ProgressBar
                    value={jobProgressPercent(job)}
                    label={`${job.processedCount}/${job.totalCandidates}`}
                  />
                </DataTableCell>
                <DataTableCell>
                  <TableActionBar className="min-h-0 justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleSelectJob(job.id)}>
                      รายละเอียด
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
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">รายละเอียดงาน</span>
              <Badge variant={STATUS_META[selectedJob.status].variant}>
                {STATUS_META[selectedJob.status].label}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={() => void listQuery.refetch()}
            >
              รีเฟรช
            </Button>
          </div>

          <ProgressBar
            value={jobProgressPercent(selectedJob)}
            label={`ดำเนินการ ${selectedJob.processedCount}/${selectedJob.totalCandidates}`}
          />

          <SummaryMetrics
            centerRows
            items={[
              { label: "ทั้งหมด", value: selectedJob.totalCandidates, tone: "default" },
              { label: "สร้างสำเร็จ", value: selectedJob.createdCount, tone: "success" },
              { label: "ข้าม", value: selectedJob.skippedCount, tone: "info" },
              { label: "ล้มเหลว", value: selectedJob.failedCount, tone: "danger" },
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

          {selectedJob.createdCount > 0 ? (
            <div className="flex flex-wrap items-end gap-3">
              <Label className="flex flex-col gap-1 font-medium">
                <span>จำนวนต่อหน้า</span>
                <Select
                  value={String(credentialLimit)}
                  onChange={(event) => {
                    setCredentialLimit(Number(event.target.value));
                    setCredentialPage(1);
                  }}
                  disabled={credentialsMutation.isPending}
                  className="w-36"
                >
                  {CREDENTIAL_LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} บัญชี
                    </option>
                  ))}
                </Select>
              </Label>
              <Label className="flex flex-col gap-1 font-medium">
                <span>หน้าที่จะออกรหัส</span>
                <Select
                  value={String(credentialPage)}
                  onChange={(event) => setCredentialPage(Number(event.target.value))}
                  disabled={credentialsMutation.isPending}
                  className="w-36"
                >
                  {Array.from({ length: credentialPageCount }, (_, index) => index + 1).map(
                    (page) => (
                      <option key={page} value={page}>
                        หน้า {page} / {credentialPageCount}
                      </option>
                    ),
                  )}
                </Select>
              </Label>
            </div>
          ) : null}

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
              disabled={credentialsMutation.isPending || selectedJob.createdCount === 0}
            >
              {credentialsMutation.isPending
                ? "กำลังออกรหัส..."
                : `ดาวน์โหลดรหัสชั่วคราว (หน้า ${credentialPage})`}
            </Button>
          </TableActionBar>

          {credentials.length > 0 ? (
            <div className="space-y-3">
              <Alert variant="success">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>
                      ออกรหัสชั่วคราว {credentials.length} บัญชี
                      {credentialMeta
                        ? ` (หน้า ${credentialMeta.page} · ${credentialMeta.limit} ต่อหน้า)`
                        : ""}
                    </AlertTitle>
                    <AlertDescription>
                      รหัสแสดงครั้งเดียว ดาวน์โหลดซ้ำจะออกรหัสใหม่และยกเลิกใบเดิม
                    </AlertDescription>
                    {credentialMeta ? (
                      <p className="mt-1 text-xs text-slate-600">
                        ดาวน์โหลดหน้า {credentialMeta.page} จากทั้งหมด {credentialMeta.total} บัญชี
                      </p>
                    ) : null}
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
