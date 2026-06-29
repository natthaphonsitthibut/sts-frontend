import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Download, KeyRound, Search, UserPlus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  Input,
  Label,
  Tabs,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SummaryMetrics,
  TableActionBar,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDateTime, formatThaiTimeRemaining } from "../../../lib/date-time";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { adminService } from "../api/admin.service";
import type {
  StudentAccountCandidate,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";

const MIN_BULK_LIMIT = 1;
const MAX_BULK_LIMIT = 200;
const CREDENTIAL_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
const PREVIEW_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
const STUDENT_ACCOUNT_TABS = [
  { value: "generate", label: "สร้างบัญชี" },
  { value: "history", label: "ประวัติ" },
];

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function buildFilter(
  scope: ReturnType<typeof useScopeCascade>,
  area: ReturnType<typeof useSchoolAreaFilter>,
  limit: number,
  page?: number,
): StudentAccountFilter {
  const safeLimit = Math.min(Math.max(limit, MIN_BULK_LIMIT), MAX_BULK_LIMIT);
  return {
    schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
    province: !scope.schoolId && area.province ? area.province : undefined,
    district: !scope.schoolId && area.district ? area.district : undefined,
    subDistrict: !scope.schoolId && area.subDistrict ? area.subDistrict : undefined,
    grade: scope.grade || undefined,
    room: scope.room ? Number(scope.room) : undefined,
    onlyWithoutAccount: true,
    page,
    limit: safeLimit,
  };
}

function getStudentAccountErrorMessage(error: unknown): string {
  const message = getApiErrorMessage(error, "กรุณาตรวจสอบตัวกรองแล้วลองใหม่");
  if (message.includes("limit must not be greater than 200")) {
    return "จำนวนต่อรอบต้องไม่เกิน 200 คน";
  }
  if (message.includes("limit must not be less than 1")) {
    return "จำนวนต่อรอบต้องอย่างน้อย 1 คน";
  }
  return message;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getCandidateSortValue(candidate: StudentAccountCandidate, key: string): string {
  if (key === "name") return candidate.studentName;
  if (key === "school") return candidate.schoolName ?? "";
  if (key === "class") return `${candidate.grade ?? ""}/${candidate.room ?? ""}`;
  if (key === "term") return `${candidate.academicYear ?? ""}/${candidate.semester ?? ""}`;
  if (key === "status") return candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง";
  return "";
}

function getCredentialSortValue(credential: StudentAccountCredential, key: string): string {
  if (key === "name") return credential.studentName;
  if (key === "school") return credential.schoolName ?? "";
  if (key === "class") return `${credential.grade ?? ""}/${credential.room ?? ""}`;
  if (key === "username") return credential.username;
  if (key === "starts") return credential.temporaryPasswordIssuedAt ?? "";
  if (key === "expires") return credential.temporaryPasswordExpiresAt ?? "";
  if (key === "remaining") return credential.temporaryPasswordExpiresAt ?? "";
  return "";
}

function formatCredentialDateTime(value?: string | null): string {
  return formatThaiDateTime(value);
}

function credentialsToTsv(credentials: StudentAccountCredential[]): string {
  const header = [
    "ชื่อ",
    "โรงเรียน",
    "ชั้น",
    "ห้อง",
    "username",
    "temp password",
    "เริ่มใช้",
    "หมดอายุ",
    "อายุที่เหลือ",
  ];
  return [
    header.join("\t"),
    ...credentials.map((credential) =>
      [
        credential.studentName,
        credential.schoolName ?? "",
        credential.grade ?? "",
        credential.room ?? "",
        credential.username,
        credential.tempPassword,
        formatCredentialDateTime(credential.temporaryPasswordIssuedAt),
        formatCredentialDateTime(credential.temporaryPasswordExpiresAt),
        formatThaiTimeRemaining(credential.temporaryPasswordExpiresAt),
      ].join("\t"),
    ),
  ].join("\n");
}

function csvEscape(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function credentialsToCsv(credentials: StudentAccountCredential[]): string {
  const header = [
    "ชื่อ",
    "โรงเรียน",
    "ชั้น",
    "ห้อง",
    "username",
    "temp password",
    "เริ่มใช้",
    "หมดอายุ",
    "อายุที่เหลือ",
  ];
  return [
    header.map(csvEscape).join(","),
    ...credentials.map((credential) =>
      [
        credential.studentName,
        credential.schoolName ?? "",
        credential.grade ?? "",
        credential.room ?? "",
        credential.username,
        credential.tempPassword,
        formatCredentialDateTime(credential.temporaryPasswordIssuedAt),
        formatCredentialDateTime(credential.temporaryPasswordExpiresAt),
        formatThaiTimeRemaining(credential.temporaryPasswordExpiresAt),
      ].map(csvEscape).join(","),
    ),
  ].join("\n");
}

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AccountGenerationProgress({
  limit,
  progress,
}: {
  limit: number;
  progress: number;
}) {
  return (
    <Alert className="border-primary/20 bg-white">
      <div className="flex items-center justify-between gap-3">
        <AlertTitle>กำลังสร้างบัญชีนักเรียน</AlertTitle>
        <div className="shrink-0 text-sm font-bold text-primary">
          {Math.round(progress)}%
        </div>
      </div>
      <div
        aria-label="กำลังประมวลผล"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className="h-full w-full origin-left rounded-full bg-primary/70 transition-transform duration-200 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <AlertDescription>
        กำลังสร้างสูงสุด {limit} คนในรอบนี้ ผลลัพธ์จะแสดงเมื่อเซิร์ฟเวอร์ทำงานเสร็จ
      </AlertDescription>
    </Alert>
  );
}

function CandidateTable({
  candidates,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
}: {
  candidates: StudentAccountCandidate[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedCandidates = useMemo(() => {
    if (!sort) return candidates;
    return [...candidates].sort((a, b) => {
      const result = compareText(
        getCandidateSortValue(a, sort.key),
        getCandidateSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [candidates, sort]);

  if (candidates.length === 0) {
    return <EmptyState icon={UserPlus} title="ไม่มีนักเรียนที่ต้องสร้างบัญชี" />;
  }

  return (
    <>
      <DataTable
        headings={[
          { label: "ชื่อ", sortKey: "name" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น/ห้อง", sortKey: "class" },
          { label: "ปี/เทอม", sortKey: "term" },
          { label: "สถานะบัญชี", sortKey: "status" },
        ]}
        minWidthClassName="min-w-[860px]"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedCandidates.map((candidate) => (
          <DataTableRow key={candidate.studentId}>
            <DataTableCell className="font-bold text-slate-800">
              {candidate.studentName}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.schoolName ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.grade ?? "-"} / {candidate.room ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.academicYear ?? "-"} / {candidate.semester ?? "-"}
            </DataTableCell>
            <DataTableCell>
              <Badge variant={candidate.hasActiveAccount ? "secondary" : "warning"}>
                {candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง"}
              </Badge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
      <TableCardList>
        {sortedCandidates.map((candidate) => (
          <TableCard key={candidate.studentId} className="space-y-2">
            <div className="font-bold text-slate-900">{candidate.studentName}</div>
            <div className="text-sm text-slate-600">
              {candidate.schoolName ?? "-"} · {candidate.grade ?? "-"} / {candidate.room ?? "-"}
            </div>
            <Badge variant={candidate.hasActiveAccount ? "secondary" : "warning"}>
              {candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง"}
            </Badge>
          </TableCard>
        ))}
      </TableCardList>
      {totalCount > 0 ? (
        <Pagination
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={PREVIEW_PAGE_SIZE_OPTIONS}
          totalCount={totalCount}
          unitLabel="คน"
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      ) : null}
    </>
  );
}

function CredentialTable({ credentials }: { credentials: StudentAccountCredential[] }) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const sortedCredentials = useMemo(() => {
    if (!sort) return credentials;
    return [...credentials].sort((a, b) => {
      const result = compareText(
        getCredentialSortValue(a, sort.key),
        getCredentialSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [credentials, sort]);
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(sortedCredentials.length / rowsPerPage)),
  );
  const visibleCredentials = sortedCredentials.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage,
  );

  if (credentials.length === 0) return null;
  return (
    <div className="space-y-3">
      <DataTable
        headings={[
          { label: "ชื่อ", sortKey: "name" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น/ห้อง", sortKey: "class" },
          { label: "username", sortKey: "username" },
          "temp password",
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} startLabel="เริ่มใช้" /> },
        ]}
        columnWidths={[
          "w-[14%]",
          "w-[14%]",
          "w-[8%]",
          "w-[12%]",
          "w-[20%]",
          "w-[32%]",
        ]}
        minWidthClassName="min-w-full"
        onSortChange={setSort}
        sort={sort}
      >
        {visibleCredentials.map((credential) => (
          <DataTableRow key={credential.userId}>
            <DataTableCell className="font-bold text-slate-800">
              {credential.studentName}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {credential.schoolName ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {credential.grade ?? "-"} / {credential.room ?? "-"}
            </DataTableCell>
            <DataTableCell className="break-all font-mono text-sm leading-5 text-slate-700">
              {credential.username}
            </DataTableCell>
            <DataTableCell className="break-all font-mono text-sm font-bold leading-5 text-slate-900">
              {credential.tempPassword}
            </DataTableCell>
            <DataTableCell>
              <LinkTimeSummary
                expiresAt={credential.temporaryPasswordExpiresAt}
                startLabel="เริ่มใช้"
                startsAt={credential.temporaryPasswordIssuedAt}
                variant="columns"
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
      <TableCardList>
        {visibleCredentials.map((credential) => (
          <TableCard key={credential.userId} className="space-y-2">
            <div className="font-bold text-slate-900">{credential.studentName}</div>
            <div className="text-sm text-slate-600">
              {credential.schoolName ?? "-"} · {credential.grade ?? "-"} / {credential.room ?? "-"}
            </div>
            <div className="grid gap-1 text-sm">
              <span className="font-mono text-slate-700">{credential.username}</span>
              <span className="font-mono font-bold text-slate-900">
                {credential.tempPassword}
              </span>
            </div>
            <LinkTimeSummary
              expiresAt={credential.temporaryPasswordExpiresAt}
              startLabel="เริ่มใช้"
              startsAt={credential.temporaryPasswordIssuedAt}
            />
          </TableCard>
        ))}
      </TableCardList>
      {credentials.length > rowsPerPage ? (
        <Pagination
          onPageChange={setPage}
          onRowsPerPageChange={(next) => {
            setRowsPerPage(next);
            setPage(1);
          }}
          page={safePage}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={CREDENTIAL_PAGE_SIZE_OPTIONS}
          totalCount={credentials.length}
          unitLabel="บัญชี"
        />
      ) : null}
    </div>
  );
}

export function StudentAccountsPage() {
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter();
  const [activeTab, setActiveTab] = useState("generate");
  const [limit, setLimit] = useState(50);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(20);
  const [credentialSession, setCredentialSession] = useState<{
    scopeKey: string;
    credentials: StudentAccountCredential[];
  }>({ scopeKey: "", credentials: [] });
  const [generationProgress, setGenerationProgress] = useState(0);
  const previewFilter = useMemo(
    () => buildFilter(scope, area, previewRowsPerPage, previewPage),
    [area, previewPage, previewRowsPerPage, scope],
  );
  const generateFilter = useMemo(
    () => buildFilter(scope, area, limit),
    [area, limit, scope],
  );
  const accountScopeKey = `${area.province || ""}|${area.district || ""}|${area.subDistrict || ""}|${scope.schoolId || ""}|${scope.grade || ""}|${scope.room || ""}`;
  const previewMutation = useMutation({
    mutationFn: (payload?: StudentAccountFilter) =>
      adminService.previewStudentAccounts(payload ?? previewFilter),
  });
  const generateMutation = useMutation({
    mutationFn: () => adminService.generateStudentAccounts(generateFilter),
    onSuccess: (result) => {
      setGenerationProgress(100);
      setCredentialSession((current) => {
        const currentCredentials =
          current.scopeKey === accountScopeKey ? current.credentials : [];
        const byUser = new Map(
          currentCredentials.map((credential) => [credential.userId, credential]),
        );
        for (const credential of result.credentials) {
          byUser.set(credential.userId, credential);
        }
        return {
          scopeKey: accountScopeKey,
          credentials: Array.from(byUser.values()),
        };
      });
      previewMutation.mutate(previewFilter);
    },
    onError: () => {
      setGenerationProgress(0);
    },
  });
  const preview = previewMutation.data;
  const generatedCredentials =
    credentialSession.scopeKey === accountScopeKey ? credentialSession.credentials : [];
  const remainingAccountCount = previewMutation.isPending
    ? undefined
    : preview?.summary.withoutAccountCount;
  const generateButtonLabel = generateMutation.isPending
    ? "กำลังสร้างบัญชี"
    : generatedCredentials.length === 0
      ? "สร้างบัญชี"
      : previewMutation.isPending
        ? "กำลังตรวจรายการ"
        : remainingAccountCount === 0
          ? "สร้างครบแล้ว"
          : "สร้างชุดถัดไป";

  useEffect(() => {
    if (!generateMutation.isPending) return;

    const intervalId = window.setInterval(() => {
      setGenerationProgress((current) => {
        const cap = 92;
        const distance = cap - current;
        if (distance <= 0) return current;
        const step = Math.max(distance * 0.06, 0.15);
        return Math.min(current + step, cap);
      });
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [generateMutation.isPending]);

  function generateStudentAccounts(): void {
    setGenerationProgress(12);
    generateMutation.mutate();
  }

  async function copyCredentials(): Promise<void> {
    if (generatedCredentials.length === 0) return;
    await navigator.clipboard.writeText(credentialsToTsv(generatedCredentials));
  }

  function exportCredentials(): void {
    if (generatedCredentials.length === 0) return;
    downloadTextFile(
      "student-accounts.csv",
      credentialsToCsv(generatedCredentials),
      "text/csv;charset=utf-8",
    );
  }

  function setAreaAndClearSchool(
    level: "province" | "district" | "subDistrict",
    value: string,
  ): void {
    area.setSchoolSearch("");
    setPreviewPage(1);
    if (level === "province") {
      area.setProvince(value);
    } else if (level === "district") {
      area.setDistrict(value);
    } else {
      area.setSubDistrict(value);
    }
    scope.setSchoolId("");
  }

  function setSchool(nextSchoolId: string): void {
    setPreviewPage(1);
    scope.setSchoolId(nextSchoolId);
    const school = area.filteredSchools.find(
      (candidate) => String(candidate.id) === nextSchoolId,
    );
    area.setAreaFromSchool(school);
  }

  function handleLimitChange(value: string): void {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setLimit(MIN_BULK_LIMIT);
      return;
    }
    setLimit(Math.min(Math.max(numericValue, MIN_BULK_LIMIT), MAX_BULK_LIMIT));
  }

  return (
    <PageShell>
      <PageToolbar
        icon={KeyRound}
        title="บัญชีนักเรียน"
        description="สร้าง username และรหัสผ่านชั่วคราวจาก roster ปัจจุบัน"
        actions={
          <Tabs
            aria-label="โหมดบัญชีนักเรียน"
            value={activeTab}
            onChange={setActiveTab}
            options={STUDENT_ACCOUNT_TABS}
          />
        }
        footerActions={
          activeTab === "generate" ? (
            <>
              <Button
                icon={Search}
                isLoading={previewMutation.isPending}
                loadingText="กำลังตรวจ"
                onClick={() => previewMutation.mutate(previewFilter)}
              >
                ดูตัวอย่าง
              </Button>
              <Button
                disabled={
                  !preview ||
                  preview.summary.withoutAccountCount === 0 ||
                  previewMutation.isPending ||
                  generateMutation.isPending
                }
                icon={UserPlus}
                onClick={generateStudentAccounts}
              >
                {generateButtonLabel}
              </Button>
            </>
          ) : undefined
        }
      >
        <ToolbarControls className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 md:items-start">
          {scope.schoolLocked ? null : (
            <>
              <ScopeField label="จังหวัด">
                <Combobox
                  onChange={(next) => {
                    setAreaAndClearSchool("province", next);
                  }}
                  options={[
                    { value: "", label: "ทุกจังหวัด" },
                    ...area.provinces.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาจังหวัด"
                  value={area.province}
                />
              </ScopeField>
              <ScopeField label="อำเภอ">
                <Combobox
                  disabled={!area.province}
                  onChange={(next) => {
                    setAreaAndClearSchool("district", next);
                  }}
                  options={[
                    { value: "", label: "ทุกอำเภอ" },
                    ...area.districts.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาอำเภอ"
                  value={area.district}
                />
              </ScopeField>
              <ScopeField label="ตำบล">
                <Combobox
                  disabled={!area.district}
                  onChange={(next) => {
                    setAreaAndClearSchool("subDistrict", next);
                  }}
                  options={[
                    { value: "", label: "ทุกตำบล" },
                    ...area.subDistricts.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาตำบล"
                  value={area.subDistrict}
                />
              </ScopeField>
            </>
          )}
          <ScopeField label="โรงเรียน">
            <Combobox
              disabled={scope.schoolLocked}
              emptyText={
                area.schoolsEnabled
                  ? "ไม่พบโรงเรียน"
                  : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/ตำบล"
              }
              onChange={setSchool}
              onSearchChange={area.setSchoolSearch}
              options={[
                { value: "", label: "ทุกโรงเรียน" },
                ...area.filteredSchools.map((school) => ({
                  value: String(school.id),
                  label: school.name,
                })),
              ]}
              placeholder="ค้นหาโรงเรียน"
              value={scope.schoolId}
            />
          </ScopeField>
          <ScopeField label="ชั้น">
            <Combobox
              disabled={!scope.schoolId || scope.gradeLocked}
              onChange={(value) => {
                setPreviewPage(1);
                scope.setGrade(value);
              }}
              options={[
                { value: "", label: "ทุกชั้น" },
                ...scope.gradeLevels.map((grade) => ({ value: grade.label, label: grade.label })),
              ]}
              searchable={false}
              value={scope.grade}
            />
          </ScopeField>
          <ScopeField label="ห้อง">
            <Combobox
              disabled={!scope.grade || scope.roomLocked}
              onChange={(value) => {
                setPreviewPage(1);
                scope.setRoom(value);
              }}
              options={[
                { value: "", label: "ทุกห้อง" },
                ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
              ]}
              searchable={false}
              value={scope.room}
            />
          </ScopeField>
          {activeTab === "generate" ? (
            <ScopeField label={`จำนวนคนต่อรอบ (${MIN_BULK_LIMIT}-${MAX_BULK_LIMIT})`}>
              <Input
                min={MIN_BULK_LIMIT}
                max={MAX_BULK_LIMIT}
                onChange={(event) => handleLimitChange(event.target.value)}
                type="number"
                value={limit}
              />
            </ScopeField>
          ) : null}
        </ToolbarControls>
      </PageToolbar>

      {activeTab === "generate" ? (
        <>
          {generateMutation.isPending ? (
            <div className="mb-5">
              <AccountGenerationProgress limit={limit} progress={generationProgress} />
            </div>
          ) : null}

          {previewMutation.isError ? (
            <ErrorState
              title="ตรวจรายชื่อไม่สำเร็จ"
              description={getStudentAccountErrorMessage(previewMutation.error)}
              onRetry={() => previewMutation.mutate(previewFilter)}
            />
          ) : preview ? (
            <div className="space-y-5">
              <SummaryMetrics
                items={[
                  { label: "ในขอบเขต", value: preview.summary.totalCount },
                  { label: "ยังไม่มีบัญชี", value: preview.summary.withoutAccountCount },
                  { label: "มีบัญชีแล้ว", value: preview.summary.existingAccountCount },
                ]}
              />
              <CandidateTable
                candidates={preview.candidates}
                page={preview.meta?.page ?? previewPage}
                rowsPerPage={preview.meta?.limit ?? previewRowsPerPage}
                totalCount={preview.meta?.totalCount ?? preview.summary.withoutAccountCount}
                onPageChange={(nextPage) => {
                  setPreviewPage(nextPage);
                  previewMutation.mutate(
                    buildFilter(scope, area, previewRowsPerPage, nextPage),
                  );
                }}
                onRowsPerPageChange={(nextRowsPerPage) => {
                  setPreviewRowsPerPage(nextRowsPerPage);
                  setPreviewPage(1);
                  previewMutation.mutate(
                    buildFilter(scope, area, nextRowsPerPage, 1),
                  );
                }}
              />
            </div>
          ) : (
            <EmptyState icon={KeyRound} title="เลือกขอบเขตแล้วดูตัวอย่าง" />
          )}

          {generateMutation.isError ? (
            <div className="mt-5">
              <ErrorState
                title="สร้างบัญชีไม่สำเร็จ"
                description={getStudentAccountErrorMessage(generateMutation.error)}
                onRetry={generateStudentAccounts}
              />
            </div>
          ) : null}

          {generatedCredentials.length > 0 ? (
            <div className="mt-5 space-y-4">
              <Alert variant="success">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>สร้างบัญชีแล้ว {generatedCredentials.length} คน</AlertTitle>
                    <AlertDescription>
                      {previewMutation.isPending
                        ? "กำลังตรวจรายการที่ยังไม่มีบัญชี"
                        : remainingAccountCount && remainingAccountCount > 0
                          ? `ยังเหลือ ${remainingAccountCount} คน กด “สร้างชุดถัดไป” เพื่อดำเนินการต่อ`
                          : "สร้างบัญชีครบตามขอบเขตแล้ว คัดลอกหรือส่งออกผลลัพธ์ได้ทันที"}
                    </AlertDescription>
                  </div>
                  <TableActionBar className="min-h-0 shrink-0">
                    <Button icon={Copy} onClick={() => void copyCredentials()} variant="outline">
                      คัดลอกตาราง
                    </Button>
                    <Button icon={Download} onClick={exportCredentials} variant="outline">
                      ส่งออก CSV
                    </Button>
                  </TableActionBar>
                </div>
              </Alert>
              <CredentialTable credentials={generatedCredentials} />
            </div>
          ) : null}
        </>
      ) : (
        <AuditLogPanel
          domain="student_accounts"
          title="ประวัติบัญชีนักเรียน"
          description="ดูรายการสร้างบัญชีนักเรียนย้อนหลังตามขอบเขตสิทธิ์และโรงเรียนที่เลือก"
          province={generateFilter.province}
          district={generateFilter.district}
          subDistrict={generateFilter.subDistrict}
          schoolId={generateFilter.schoolId}
          showActionColumn={false}
          showReferenceColumn={false}
        />
      )}
    </PageShell>
  );
}
