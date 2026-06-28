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
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { adminService } from "../api/admin.service";
import type {
  StudentAccountCandidate,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";

const MIN_BULK_LIMIT = 1;
const MAX_BULK_LIMIT = 200;
const CREDENTIAL_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function buildFilter(scope: ReturnType<typeof useScopeCascade>, limit: number): StudentAccountFilter {
  const safeLimit = Math.min(Math.max(limit, MIN_BULK_LIMIT), MAX_BULK_LIMIT);
  return {
    schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
    grade: scope.grade || undefined,
    room: scope.room ? Number(scope.room) : undefined,
    onlyWithoutAccount: true,
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
  if (key === "issued") return credential.temporaryPasswordIssuedAt ?? "";
  if (key === "expires") return credential.temporaryPasswordExpiresAt ?? "";
  return "";
}

function formatCredentialDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCredentialAge(issuedAt?: string | null, expiresAt?: string | null): string {
  if (!issuedAt || !expiresAt) return "-";
  const start = new Date(issuedAt);
  const end = new Date(expiresAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const totalHours = Math.max(0, Math.round((end.getTime() - start.getTime()) / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} วัน ${hours} ชม.`;
  if (days > 0) return `${days} วัน`;
  return `${hours} ชม.`;
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
    "อายุ",
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
        formatCredentialAge(
          credential.temporaryPasswordIssuedAt,
          credential.temporaryPasswordExpiresAt,
        ),
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
    "อายุ",
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
        formatCredentialAge(
          credential.temporaryPasswordIssuedAt,
          credential.temporaryPasswordExpiresAt,
        ),
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

function AccountGenerationProgress({ limit }: { limit: number }) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress((current) => {
        if (elapsed < 1_200) return Math.min(68, current + 8);
        if (elapsed < 5_000) return Math.min(88, current + 2);
        return Math.min(94, current + 0.5);
      });
    }, 180);

    return () => window.clearInterval(intervalId);
  }, []);
  const displayProgress = Math.round(progress);

  return (
    <Alert className="border-primary/20 bg-white">
      <div className="flex items-center justify-between gap-3">
        <AlertTitle>กำลังสร้างบัญชีนักเรียน</AlertTitle>
        <div className="shrink-0 font-mono text-sm font-bold text-primary">
          {displayProgress}%
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      <AlertDescription>
        กำลังสร้างสูงสุด {limit} คนในรอบนี้ ระบบจะช้าลงใกล้ท้ายกระบวนการเพื่อรอผลจากเซิร์ฟเวอร์
      </AlertDescription>
    </Alert>
  );
}

function CandidateTable({ candidates }: { candidates: StudentAccountCandidate[] }) {
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
          { label: "เริ่มใช้", sortKey: "issued" },
          { label: "หมดอายุ", sortKey: "expires" },
          "อายุ",
        ]}
        minWidthClassName="min-w-[1240px]"
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
            <DataTableCell className="font-mono text-sm text-slate-700">
              {credential.username}
            </DataTableCell>
            <DataTableCell className="font-mono text-sm font-bold text-slate-900">
              {credential.tempPassword}
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {formatCredentialDateTime(credential.temporaryPasswordIssuedAt)}
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {formatCredentialDateTime(credential.temporaryPasswordExpiresAt)}
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-700">
              {formatCredentialAge(
                credential.temporaryPasswordIssuedAt,
                credential.temporaryPasswordExpiresAt,
              )}
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
            <div className="grid gap-1 text-xs text-slate-500">
              <span>เริ่มใช้ {formatCredentialDateTime(credential.temporaryPasswordIssuedAt)}</span>
              <span>หมดอายุ {formatCredentialDateTime(credential.temporaryPasswordExpiresAt)}</span>
              <span>
                อายุ{" "}
                {formatCredentialAge(
                  credential.temporaryPasswordIssuedAt,
                  credential.temporaryPasswordExpiresAt,
                )}
              </span>
            </div>
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
  const [limit, setLimit] = useState(50);
  const [credentialSession, setCredentialSession] = useState<{
    scopeKey: string;
    credentials: StudentAccountCredential[];
  }>({ scopeKey: "", credentials: [] });
  const filter = useMemo(() => buildFilter(scope, limit), [scope, limit]);
  const accountScopeKey = `${scope.schoolId || ""}|${scope.grade || ""}|${scope.room || ""}`;
  const previewMutation = useMutation({
    mutationFn: () => adminService.previewStudentAccounts(filter),
  });
  const generateMutation = useMutation({
    mutationFn: () => adminService.generateStudentAccounts(filter),
    onSuccess: (result) => {
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
      previewMutation.mutate();
    },
  });
  const preview = previewMutation.data;
  const generatedCredentials =
    credentialSession.scopeKey === accountScopeKey ? credentialSession.credentials : [];

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
    <PageShell maxWidthClassName="max-w-[1180px]">
      <PageToolbar
        icon={KeyRound}
        title="บัญชีนักเรียน"
        description="สร้าง username และรหัสผ่านชั่วคราวจาก roster ปัจจุบัน"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={Search}
              isLoading={previewMutation.isPending}
              loadingText="กำลังตรวจ"
              onClick={() => previewMutation.mutate()}
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
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending
                ? "กำลังสร้างบัญชี"
                : generatedCredentials.length > 0
                  ? "สร้างชุดถัดไป"
                  : "สร้างบัญชี"}
            </Button>
          </div>
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
              onChange={scope.setGrade}
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
              onChange={scope.setRoom}
              options={[
                { value: "", label: "ทุกห้อง" },
                ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
              ]}
              searchable={false}
              value={scope.room}
            />
          </ScopeField>
          <ScopeField label={`จำนวนคนต่อรอบ (${MIN_BULK_LIMIT}-${MAX_BULK_LIMIT})`}>
            <Input
              min={MIN_BULK_LIMIT}
              max={MAX_BULK_LIMIT}
              onChange={(event) => handleLimitChange(event.target.value)}
              type="number"
              value={limit}
            />
          </ScopeField>
        </ToolbarControls>
      </PageToolbar>

      {generateMutation.isPending ? (
        <div className="mb-5">
          <AccountGenerationProgress limit={limit} />
        </div>
      ) : null}

      {previewMutation.isError ? (
        <ErrorState
          title="ตรวจรายชื่อไม่สำเร็จ"
          description={getStudentAccountErrorMessage(previewMutation.error)}
          onRetry={() => previewMutation.mutate()}
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
          <CandidateTable candidates={preview.candidates} />
        </div>
      ) : (
        <EmptyState icon={KeyRound} title="เลือกขอบเขตแล้วดูตัวอย่าง" />
      )}

      {generateMutation.isError ? (
        <div className="mt-5">
          <ErrorState
            title="สร้างบัญชีไม่สำเร็จ"
            description={getStudentAccountErrorMessage(generateMutation.error)}
            onRetry={() => generateMutation.mutate()}
          />
        </div>
      ) : null}

      {generatedCredentials.length > 0 ? (
        <div className="mt-5 space-y-4">
          <Alert>
            <AlertTitle>สะสมบัญชีที่สร้างแล้ว {generatedCredentials.length} คน</AlertTitle>
            <AlertDescription>
              กด “สร้างชุดถัดไป” เพื่อสร้างต่อจากรายชื่อที่ยังไม่มีบัญชี
              แล้วคัดลอกหรือส่งออกผลลัพธ์ทั้งหมดในชุดนี้
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap justify-end gap-2">
            <Button icon={Copy} onClick={() => void copyCredentials()} variant="outline">
              คัดลอกตาราง
            </Button>
            <Button icon={Download} onClick={exportCredentials} variant="outline">
              ส่งออก CSV
            </Button>
          </div>
          <CredentialTable credentials={generatedCredentials} />
        </div>
      ) : null}
    </PageShell>
  );
}
