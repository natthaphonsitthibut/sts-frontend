import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Copy, Download, KeyRound, Search, UserPlus, Users, UserX, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Checkbox,
  Combobox,
  FormErrorAlert,
  Input,
  Label,
  Tabs,
  useConfirm,
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
import { RefreshButton } from "../../../components/layout/refresh-button";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { formatRoomLabel, toRoomOption } from "../../../lib/room-presentation";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
  TableActionBar,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDateTime, formatThaiTimeRemaining } from "../../../lib/date-time";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { adminService } from "../api/admin.service";
import { AccountDeactivationDialog } from "../components/AccountDeactivationDialog";
import { StudentAccountBatchPanel } from "../components/StudentAccountBatchPanel";
import { StudentAccountManagementTable } from "../components/StudentAccountManagementTable";
import {
  useBulkReissueStudentTemporaryPasswords,
  useDeactivateStudentAccount,
  useReactivateStudentAccount,
  useStudentAccounts,
  STUDENT_ACCOUNTS_QUERY_KEY,
} from "../hooks/useUsers";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type {
  AccountDeactivationPayload,
  StudentAccountCandidate,
  StudentAccountCredential,
  StudentAccountFilter,
  StudentAccountListQuery,
  StudentAccountManagementItem,
  StudentAccountManagementStatus,
  StudentAccountStatusCounts,
} from "../types/admin.types";
import { STUDENT_QUERY_KEY } from "../../students/hooks/useStudent";

const MIN_BULK_LIMIT = 1;
const MAX_BULK_LIMIT = 200;
const CREDENTIAL_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
const PREVIEW_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
const STUDENT_ACCOUNT_TABS = [
  { value: "manage", label: "จัดการบัญชี" },
  { value: "generate", label: "สร้างบัญชี" },
  { value: "history", label: "ประวัติ" },
];
const STUDENT_ACCOUNT_STATUS_ICONS = {
  PENDING_FIRST_LOGIN: KeyRound,
  ACTIVE: CheckCircle2,
  TEMP_PASSWORD_EXPIRED: Clock,
  DISABLED: UserX,
} as const;
function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="sr-only">{label}</Label>
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

function buildManagementQuery(
  scope: ReturnType<typeof useScopeCascade>,
  area: ReturnType<typeof useSchoolAreaFilter>,
  limit: number,
  page: number,
  searchTerm: string,
  accountStatus: "" | StudentAccountManagementStatus,
): StudentAccountListQuery {
  return {
    schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
    province: !scope.schoolId && area.province ? area.province : undefined,
    district: !scope.schoolId && area.district ? area.district : undefined,
    subDistrict: !scope.schoolId && area.subDistrict ? area.subDistrict : undefined,
    grade: scope.grade || undefined,
    room: scope.room ? Number(scope.room) : undefined,
    searchTerm: searchTerm || undefined,
    accountStatus: accountStatus || undefined,
    page,
    limit,
  };
}

function getFallbackStatusCounts(
  accounts: readonly StudentAccountManagementItem[],
): StudentAccountStatusCounts {
  return accounts.reduce<StudentAccountStatusCounts>(
    (counts, account) => ({
      ...counts,
      [account.status]: counts[account.status] + 1,
    }),
    {
      PENDING_FIRST_LOGIN: 0,
      ACTIVE: 0,
      TEMP_PASSWORD_EXPIRED: 0,
      DISABLED: 0,
    },
  );
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
  if (key === "grade") return candidate.grade ?? "";
  if (key === "room") return String(candidate.room ?? "");
  if (key === "term") return `${candidate.academicYear ?? ""}/${candidate.semester ?? ""}`;
  if (key === "status") return candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง";
  return "";
}

function getCredentialSortValue(credential: StudentAccountCredential, key: string): string {
  if (key === "name") return credential.studentName;
  if (key === "school") return credential.schoolName ?? "";
  if (key === "grade") return credential.grade ?? "";
  if (key === "room") return String(credential.room ?? "");
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

function CandidateTable({
  candidates,
  searchTerm,
  selectedIds,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onSelectAll,
  onSelectRow,
}: {
  candidates: StudentAccountCandidate[];
  searchTerm: string;
  selectedIds: ReadonlySet<string>;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSelectAll: (selected: boolean, rows: readonly StudentAccountCandidate[]) => void;
  onSelectRow: (studentId: string, selected: boolean) => void;
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
  const allSelected =
    sortedCandidates.length > 0 &&
    sortedCandidates.every((candidate) => selectedIds.has(candidate.studentId));

  if (candidates.length === 0) {
    return (
      <EmptyState
        description={
          searchTerm
            ? "ลองตรวจคำค้นหา หรือปรับขอบเขตโรงเรียน ชั้น และห้อง"
            : "นักเรียนในขอบเขตนี้มีบัญชีผู้ใช้ครบแล้วทุกคน"
        }
        icon={UserPlus}
        title={searchTerm ? "ไม่พบนักเรียนที่ค้นหา" : "ไม่มีนักเรียนที่ต้องสร้างบัญชี"}
      />
    );
  }

  return (
    <>
      <DataTable
        headings={[
          {
            label: (
              <Checkbox
                aria-label="เลือกนักเรียนทั้งหมดในหน้านี้"
                checked={allSelected}
                onChange={(event) =>
                  onSelectAll(event.currentTarget.checked, sortedCandidates)
                }
              />
            ),
            className: "w-[52px]",
          },
          { label: "ชื่อ", sortKey: "name" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น", sortKey: "grade" },
          { label: "ห้อง", sortKey: "room" },
          { label: "ปี/เทอม", sortKey: "term" },
          { label: "สถานะบัญชี", sortKey: "status" },
        ]}
        minWidthClassName="min-w-[940px]"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedCandidates.map((candidate) => (
          <DataTableRow key={candidate.studentId}>
            <DataTableCell>
              <Checkbox
                aria-label={`เลือก ${candidate.studentName}`}
                checked={selectedIds.has(candidate.studentId)}
                onChange={(event) =>
                  onSelectRow(candidate.studentId, event.currentTarget.checked)
                }
              />
            </DataTableCell>
            <DataTableCell className="font-bold text-slate-800">
              {candidate.studentName}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.schoolName ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.grade ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {formatRoomLabel(candidate.room)}
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
            <div className="flex items-start gap-3">
              <Checkbox
                aria-label={`เลือก ${candidate.studentName}`}
                checked={selectedIds.has(candidate.studentId)}
                onChange={(event) =>
                  onSelectRow(candidate.studentId, event.currentTarget.checked)
                }
              />
              <div className="font-bold text-slate-900">{candidate.studentName}</div>
            </div>
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
          { label: "ชั้น", sortKey: "grade" },
          { label: "ห้อง", sortKey: "room" },
          { label: "username", sortKey: "username" },
          "temp password",
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} /> },
        ]}
        columnWidths={[
          "w-[13%]",
          "w-[13%]",
          "w-[7%]",
          "w-[8%]",
          "w-[11%]",
          "w-[18%]",
          "w-[30%]",
        ]}
        minWidthClassName="min-w-[1080px]"
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
              {credential.grade ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {formatRoomLabel(credential.room)}
            </DataTableCell>
            <DataTableCell className="break-all text-sm leading-5 text-slate-700">
              {credential.username}
            </DataTableCell>
            <DataTableCell className="break-all text-sm font-bold leading-5 text-slate-900">
              {credential.tempPassword}
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
        {visibleCredentials.map((credential) => (
          <TableCard key={credential.userId} className="space-y-2">
            <div className="font-bold text-slate-900">{credential.studentName}</div>
            <div className="text-sm text-slate-600">
              {credential.schoolName ?? "-"} · {credential.grade ?? "-"} / {credential.room ?? "-"}
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-slate-700">{credential.username}</span>
              <span className="font-bold text-slate-900">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkStudentId = searchParams.get("studentId")?.trim() ?? "";
  const initialSchoolId = searchParams.get("schoolId")?.trim() ?? "";
  const initialSchoolName = searchParams.get("schoolName")?.trim() ?? "";
  const initialGrade = searchParams.get("grade")?.trim() ?? "";
  const initialRoom = searchParams.get("room")?.trim() ?? "";
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const scope = useScopeCascade({
    lockToActorScope: true,
    initialSchoolId,
    initialGrade,
    initialRoom,
  });
  const area = useSchoolAreaFilter({
    province: deepLinkStudentId ? undefined : searchParams.get("province") ?? undefined,
    district: deepLinkStudentId ? undefined : searchParams.get("district") ?? undefined,
    subDistrict: deepLinkStudentId
      ? undefined
      : searchParams.get("subDistrict") ?? undefined,
    schoolSearch: initialSchoolName || undefined,
  });
  const [activeTab, setActiveTab] = useRouteTab(
    {
      manage: "/manage-student-accounts",
      generate: "/manage-student-accounts/generate",
      batch: "/manage-student-accounts/batch",
      history: "/manage-student-accounts/history",
    } as const,
    "manage",
  );
  const selectedTab = activeTab === "batch" ? "generate" : activeTab;
  const [searchQuery, setSearchQuery] = useState("");
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const [accountStatus, setAccountStatus] = useState<"" | StudentAccountManagementStatus>("");
  const [managementPage, setManagementPage] = useState(1);
  const [managementRowsPerPage, setManagementRowsPerPage] = useState(20);
  const [selectedAccountIds, setSelectedAccountIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [limit, setLimit] = useState(() => {
    const requestedLimit = Number(searchParams.get("limit"));
    return Number.isInteger(requestedLimit) &&
      requestedLimit >= MIN_BULK_LIMIT &&
      requestedLimit <= MAX_BULK_LIMIT
      ? requestedLimit
      : 50;
  });
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(20);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [createdCredentials, setCreatedCredentials] = useState<StudentAccountCredential[]>([]);
  const deepLinkAreaHandledRef = useRef(false);
  const deepLinkHandledRef = useRef(false);
  const [credentialSession, setCredentialSession] = useState<{
    scopeKey: string;
    credentials: StudentAccountCredential[];
  }>({ scopeKey: "", credentials: [] });
  const [batchStartRequestKey, setBatchStartRequestKey] = useState(0);
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const debouncedCandidateSearch = useDebouncedValue(candidateSearchQuery.trim(), 350);
  const managementQuery = useMemo(
    () =>
      buildManagementQuery(
        scope,
        area,
        managementRowsPerPage,
        managementPage,
        debouncedSearch,
        accountStatus,
      ),
    [
      accountStatus,
      area,
      debouncedSearch,
      managementPage,
      managementRowsPerPage,
      scope,
    ],
  );
  const previewFilter = useMemo(
    () => ({
      ...buildFilter(scope, area, previewRowsPerPage, previewPage),
      searchTerm: debouncedCandidateSearch || undefined,
    }),
    [area, debouncedCandidateSearch, previewPage, previewRowsPerPage, scope],
  );
  const generateFilter = useMemo(
    () => buildFilter(scope, area, limit),
    [area, limit, scope],
  );
  const {
    accounts,
    meta: accountsMeta,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
    dataUpdatedAt: accountsUpdatedAt,
  } = useStudentAccounts(managementQuery);
  const lifecycleCatalog = useStatusCatalog("USER_ACCOUNT_LIFECYCLE");
  const accountStatusOptions: Array<{
    value: "" | StudentAccountManagementStatus;
    label: string;
  }> = [
    { value: "", label: "ทุกสถานะ" },
    ...lifecycleCatalog.items.map((item) => ({
      value: item.code as StudentAccountManagementStatus,
      label: item.label,
    })),
  ];
  const accountStatusCounts = useMemo(
    () => accountsMeta?.statusCounts ?? getFallbackStatusCounts(accounts),
    [accounts, accountsMeta?.statusCounts],
  );
  const accountStatusTotal = useMemo(
    () =>
      lifecycleCatalog.items.reduce(
        (total, item) =>
          total + (accountStatusCounts[item.code as StudentAccountManagementStatus] ?? 0),
        0,
      ),
    [accountStatusCounts, lifecycleCatalog.items],
  );
  const bulkReissueMutation = useBulkReissueStudentTemporaryPasswords();
  const deactivateMutation = useDeactivateStudentAccount();
  const reactivateMutation = useReactivateStudentAccount();
  const [deactivationTarget, setDeactivationTarget] =
    useState<StudentAccountManagementItem | null>(null);
  const accountScopeKey = `${area.province || ""}|${area.district || ""}|${area.subDistrict || ""}|${scope.schoolId || ""}|${scope.grade || ""}|${scope.room || ""}`;
  const previewMutation = useMutation({
    mutationFn: (payload?: StudentAccountFilter) =>
      adminService.previewStudentAccounts(payload ?? previewFilter),
    meta: { suppressSuccessToast: true },
  });
  const preview = previewMutation.data;
  const generateSelectedMutation = useMutation({
    mutationFn: (payload: StudentAccountFilter) =>
      adminService.generateStudentAccounts(payload),
    onSuccess: (result) => {
      setCreatedCredentials(result.credentials);
      setSelectedCandidateIds(new Set());
      void queryClient.invalidateQueries({ queryKey: [STUDENT_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [STUDENT_ACCOUNTS_QUERY_KEY] });
      previewMutation.mutate(previewFilter);
    },
  });
  const generatedCredentials =
    credentialSession.scopeKey === accountScopeKey ? credentialSession.credentials : [];

  const consumeDeepLinkContext = useCallback((): void => {
    if (!searchParams.has("studentId")) return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("studentId");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateFilterSearchParams = useCallback(
    (updates: Record<string, string | undefined>): void => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("studentId");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          nextSearchParams.set(key, value);
        } else {
          nextSearchParams.delete(key);
        }
      }
      setSearchParams(nextSearchParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilterSearchParams = useCallback((): void => {
    const nextSearchParams = new URLSearchParams(searchParams);
    for (const key of [
      "studentId",
      "schoolId",
      "schoolName",
      "grade",
      "room",
      "province",
      "district",
      "subDistrict",
      "limit",
    ]) {
      nextSearchParams.delete(key);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (deepLinkAreaHandledRef.current || !initialSchoolId) return;

    const initialSchool = area.filteredSchools.find(
      (school) => String(school.id) === initialSchoolId,
    );
    if (!initialSchool) return;

    deepLinkAreaHandledRef.current = true;
    area.setAreaFromSchool(initialSchool);
  }, [area, initialSchoolId]);

  useEffect(() => {
    if (
      deepLinkHandledRef.current ||
      selectedTab !== "generate" ||
      !deepLinkStudentId ||
      (initialSchoolId && scope.schoolId !== initialSchoolId) ||
      (initialGrade && scope.grade !== initialGrade) ||
      (initialRoom && scope.room !== initialRoom)
    ) {
      return;
    }

    deepLinkHandledRef.current = true;
    consumeDeepLinkContext();
    previewMutation.mutate(
      {
        ...previewFilter,
        searchTerm: undefined,
        studentIds: [deepLinkStudentId],
        page: 1,
        limit: 20,
      },
      {
        onSuccess: (result) => {
          const candidate = result.candidates.find(
            (item) => item.studentId === deepLinkStudentId,
          );
          if (candidate) {
            setCandidateSearchQuery(candidate.studentName);
            setSelectedCandidateIds(new Set([deepLinkStudentId]));
          }
        },
      },
    );
  }, [
    consumeDeepLinkContext,
    deepLinkStudentId,
    initialGrade,
    initialRoom,
    initialSchoolId,
    previewFilter,
    previewMutation,
    scope.grade,
    scope.room,
    scope.schoolId,
    selectedTab,
  ]);

  function resetManagementList(): void {
    setManagementPage(1);
    setSelectedAccountIds(new Set());
  }

  function cancelCandidateSelection(): void {
    setSelectedCandidateIds(new Set());
    consumeDeepLinkContext();
  }

  function handleSelectCandidate(studentId: string, selected: boolean): void {
    if (!selected && studentId === deepLinkStudentId) {
      consumeDeepLinkContext();
    }
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      if (selected) {
        if (next.size >= MAX_BULK_LIMIT) {
          return current;
        }
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  }

  function handleSelectAllCandidates(
    selected: boolean,
    rows: readonly StudentAccountCandidate[],
  ): void {
    if (
      !selected &&
      rows.some((row) => row.studentId === deepLinkStudentId)
    ) {
      consumeDeepLinkContext();
    }
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (selected) {
          if (next.size >= MAX_BULK_LIMIT) {
            break;
          }
          next.add(row.studentId);
        } else {
          next.delete(row.studentId);
        }
      }
      return next;
    });
  }

  async function generateSelectedStudentAccounts(): Promise<void> {
    const studentIds = Array.from(selectedCandidateIds);
    if (studentIds.length === 0) {
      return;
    }
    const accepted = await confirm({
      title: "สร้างบัญชีนักเรียนที่เลือก",
      description: `ต้องการสร้างบัญชีให้นักเรียนที่เลือก ${studentIds.length} คนใช่หรือไม่?`,
      confirmText: "สร้างบัญชี",
    });
    if (!accepted) {
      return;
    }
    generateSelectedMutation.mutate({
      ...generateFilter,
      studentIds,
      page: 1,
      limit: studentIds.length,
    });
  }

  function handleManagementRowsPerPageChange(value: number): void {
    // Same filtered dataset, just re-paginated — keep the selection.
    setManagementRowsPerPage(value);
    setManagementPage(1);
  }

  function handleSelectRow(userId: number, selected: boolean): void {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }

  function handleSelectAll(selected: boolean, rows: readonly StudentAccountManagementItem[]): void {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (selected) {
          next.add(row.userId);
        } else {
          next.delete(row.userId);
        }
      }
      return next;
    });
  }

  function storeReissuedCredentials(credentials: StudentAccountCredential[]): void {
    if (credentials.length === 0) return;
    setCredentialSession((current) => {
      const currentCredentials =
        current.scopeKey === accountScopeKey ? current.credentials : [];
      const byUser = new Map(
        currentCredentials.map((credential) => [credential.userId, credential]),
      );
      for (const credential of credentials) {
        byUser.set(credential.userId, credential);
      }
      return {
        scopeKey: accountScopeKey,
        credentials: Array.from(byUser.values()),
      };
    });
  }

  async function handleBulkReissueSelected(): Promise<void> {
    const userIds = Array.from(selectedAccountIds);
    if (userIds.length === 0) return;
    const confirmed = await confirm({
      title: "ออกรหัสชั่วคราวใหม่",
      description: `ต้องการออกรหัสใหม่ให้บัญชีนักเรียน ${userIds.length} คนใช่หรือไม่? รหัสเดิมจะใช้ไม่ได้ทันที`,
      confirmText: "ออกรหัสใหม่",
    });
    if (!confirmed) return;
    bulkReissueMutation.mutate(
      { ...managementQuery, userIds },
      {
        onSuccess: (result) => {
          storeReissuedCredentials(result.credentials);
          setSelectedAccountIds(new Set());
        },
      },
    );
  }

  async function handleBulkReissueExpired(): Promise<void> {
    const confirmed = await confirm({
      title: "ออกรหัสใหม่ให้บัญชีหมดอายุ",
      description: "ต้องการออกรหัสใหม่ให้บัญชีนักเรียนที่รหัสหมดอายุในขอบเขตนี้ใช่หรือไม่?",
      confirmText: "ออกรหัสใหม่",
    });
    if (!confirmed) return;
    bulkReissueMutation.mutate(
      { ...managementQuery, onlyExpired: true, page: 1, limit: MAX_BULK_LIMIT },
      {
        onSuccess: (result) => {
          storeReissuedCredentials(result.credentials);
          setSelectedAccountIds(new Set());
        },
      },
    );
  }

  async function handleReissueRow(row: StudentAccountManagementItem): Promise<void> {
    const confirmed = await confirm({
      title: "ออกรหัสชั่วคราวใหม่",
      description: `ต้องการออกรหัสใหม่ให้ "${row.studentName}" ใช่หรือไม่? รหัสเดิมจะใช้ไม่ได้ทันที`,
      confirmText: "ออกรหัสใหม่",
    });
    if (!confirmed) return;
    bulkReissueMutation.mutate(
      { ...managementQuery, userIds: [row.userId] },
      {
        onSuccess: (result) => storeReissuedCredentials(result.credentials),
      },
    );
  }

  function handleDeactivateRow(row: StudentAccountManagementItem): void {
    setDeactivationTarget(row);
  }

  function submitDeactivateStudentAccount(payload: AccountDeactivationPayload): void {
    if (!deactivationTarget) return;
    deactivateMutation.mutate(
      { id: deactivationTarget.userId, payload },
      {
        onSuccess: () => {
          setSelectedAccountIds((current) => {
            const next = new Set(current);
            next.delete(deactivationTarget.userId);
            return next;
          });
          setDeactivationTarget(null);
        },
      },
    );
  }

  async function handleReactivateRow(row: StudentAccountManagementItem): Promise<void> {
    const confirmed = await confirm({
      title: "เปิดใช้งานบัญชีนักเรียน",
      description: `ต้องการเปิดใช้งานบัญชีของ "${row.studentName}" อีกครั้งใช่หรือไม่?`,
      confirmText: "เปิดใช้งาน",
    });
    if (!confirmed) return;
    reactivateMutation.mutate(row.userId, {
      onSuccess: () => {
        setSelectedAccountIds((current) => {
          const next = new Set(current);
          next.delete(row.userId);
          return next;
        });
      },
    });
  }

  // Every generate click — regardless of scope size — starts the same
  // background job (`StudentAccountBatchPanel` below), so there's exactly
  // one way to create accounts instead of a small-batch/large-batch split
  // the user has to guess between.
  function generateStudentAccounts(): void {
    setBatchStartRequestKey((current) => current + 1);
  }

  async function copyCredentials(): Promise<void> {
    if (generatedCredentials.length === 0) return;
    await navigator.clipboard.writeText(credentialsToTsv(generatedCredentials));
  }

  async function exportCredentials(): Promise<void> {
    if (generatedCredentials.length === 0) return;
    const accepted = await confirm({
      title: "ยืนยันการดาวน์โหลดไฟล์บัญชี",
      description:
        "ไฟล์ CSV มีชื่อผู้ใช้และรหัสผ่านชั่วคราวของนักเรียน กรุณาเก็บรักษาและส่งต่ออย่างปลอดภัย",
      confirmText: "ดาวน์โหลด",
    });
    if (!accepted) return;
    downloadTextFile(
      "student-accounts.csv",
      credentialsToCsv(generatedCredentials),
      "text/csv;charset=utf-8",
    );
  }

  async function copyCreatedCredentials(): Promise<void> {
    if (createdCredentials.length === 0) return;
    await navigator.clipboard.writeText(credentialsToTsv(createdCredentials));
  }

  async function exportCreatedCredentials(): Promise<void> {
    if (createdCredentials.length === 0) return;
    const accepted = await confirm({
      title: "ยืนยันการดาวน์โหลดไฟล์บัญชี",
      description:
        "ไฟล์ CSV มีชื่อผู้ใช้และรหัสผ่านชั่วคราวของนักเรียน กรุณาเก็บรักษาและส่งต่ออย่างปลอดภัย",
      confirmText: "ดาวน์โหลด",
    });
    if (!accepted) return;
    downloadTextFile(
      "student-accounts-created.csv",
      credentialsToCsv(createdCredentials),
      "text/csv;charset=utf-8",
    );
  }

  function setAreaAndClearSchool(
    level: "province" | "district" | "subDistrict",
    value: string,
  ): void {
    area.setSchoolSearch("");
    setPreviewPage(1);
    setSelectedCandidateIds(new Set());
    previewMutation.reset();
    resetManagementList();
    if (level === "province") {
      area.setProvince(value);
      updateFilterSearchParams({
        province: value || undefined,
        district: undefined,
        subDistrict: undefined,
        schoolId: undefined,
        schoolName: undefined,
        grade: undefined,
        room: undefined,
      });
    } else if (level === "district") {
      area.setDistrict(value);
      updateFilterSearchParams({
        district: value || undefined,
        subDistrict: undefined,
        schoolId: undefined,
        schoolName: undefined,
        grade: undefined,
        room: undefined,
      });
    } else {
      area.setSubDistrict(value);
      updateFilterSearchParams({
        subDistrict: value || undefined,
        schoolId: undefined,
        schoolName: undefined,
        grade: undefined,
        room: undefined,
      });
    }
    scope.setSchoolId("");
  }

  function setSchool(nextSchoolId: string): void {
    setPreviewPage(1);
    setSelectedCandidateIds(new Set());
    previewMutation.reset();
    resetManagementList();
    scope.setSchoolId(nextSchoolId);
    const school = area.filteredSchools.find(
      (candidate) => String(candidate.id) === nextSchoolId,
    );
    area.setAreaFromSchool(school);
    updateFilterSearchParams({
      province: school?.province || undefined,
      district: school?.district || undefined,
      subDistrict: school?.sub_district || undefined,
      schoolId: nextSchoolId || undefined,
      schoolName: school?.name || undefined,
      grade: undefined,
      room: undefined,
    });
  }

  function handleLimitChange(value: string): void {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setLimit(MIN_BULK_LIMIT);
      updateFilterSearchParams({ limit: String(MIN_BULK_LIMIT) });
      return;
    }
    const nextLimit = Math.min(
      Math.max(numericValue, MIN_BULK_LIMIT),
      MAX_BULK_LIMIT,
    );
    setLimit(nextLimit);
    updateFilterSearchParams({ limit: String(nextLimit) });
  }

  function handleClearFilters(): void {
    area.reset();
    scope.reset();
    setSearchQuery("");
    setCandidateSearchQuery("");
    setAccountStatus("");
    setLimit(50);
    setPreviewPage(1);
    setSelectedCandidateIds(new Set());
    setCreatedCredentials([]);
    previewMutation.reset();
    resetManagementList();
    clearFilterSearchParams();
  }

  return (
    <PageShell>
      <ListPageToolbar
        icon={KeyRound}
        title="บัญชีนักเรียน"
        description="สร้างชื่อผู้ใช้และรหัสผ่านชั่วคราวจากข้อมูลนักเรียนปัจจุบัน"
        onClearFilters={handleClearFilters}
        actions={
          <Tabs
            aria-label="โหมดบัญชีนักเรียน"
            value={selectedTab}
            onChange={setActiveTab}
            options={STUDENT_ACCOUNT_TABS}
          />
        }
        search={
          selectedTab === "manage"
            ? {
                value: searchQuery,
                onChange: (value) => {
                  setSearchQuery(value);
                  resetManagementList();
                },
                placeholder: "ค้นหาชื่อหรือ username...",
              }
            : selectedTab === "generate"
              ? {
                  value: candidateSearchQuery,
                  onChange: (value) => {
                    setCandidateSearchQuery(value);
                    setPreviewPage(1);
                    previewMutation.reset();
                  },
                  placeholder: "ค้นหาชื่อนักเรียน...",
                }
              : undefined
        }
        filters={
          <>
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
                <ScopeField label="อำเภอ/เขต">
                  <Combobox
                    disabled={!area.province}
                    onChange={(next) => {
                      setAreaAndClearSchool("district", next);
                    }}
                    options={[
                      { value: "", label: "ทุกอำเภอ/เขต" },
                      ...area.districts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ค้นหาอำเภอ/เขต"
                    value={area.district}
                  />
                </ScopeField>
                <ScopeField label="ตำบล/แขวง">
                  <Combobox
                    disabled={!area.district}
                    onChange={(next) => {
                      setAreaAndClearSchool("subDistrict", next);
                    }}
                    options={[
                      { value: "", label: "ทุกตำบล/แขวง" },
                      ...area.subDistricts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ค้นหาตำบล/แขวง"
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
                    : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง"
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
                  setSelectedCandidateIds(new Set());
                  previewMutation.reset();
                  resetManagementList();
                  scope.setGrade(value);
                  updateFilterSearchParams({
                    grade: value || undefined,
                    room: undefined,
                  });
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
                  setSelectedCandidateIds(new Set());
                  previewMutation.reset();
                  resetManagementList();
                  scope.setRoom(value);
                  updateFilterSearchParams({ room: value || undefined });
                }}
                options={[
                  { value: "", label: "ทุกห้อง" },
                  ...scope.rooms.map(toRoomOption),
                ]}
                searchable={false}
                value={scope.room}
              />
            </ScopeField>
            {selectedTab === "generate" ? (
              <ScopeField label={`จำนวนคนต่อรอบ (${MIN_BULK_LIMIT}-${MAX_BULK_LIMIT})`}>
                <Input
                  min={MIN_BULK_LIMIT}
                  max={MAX_BULK_LIMIT}
                  onChange={(event) => handleLimitChange(event.target.value)}
                  type="number"
                  value={limit}
                />
              </ScopeField>
            ) : selectedTab === "manage" ? (
              <ScopeField label="สถานะบัญชี">
                <Combobox
                  onChange={(value) => {
                    setAccountStatus(value as "" | StudentAccountManagementStatus);
                    resetManagementList();
                  }}
                  options={accountStatusOptions}
                  searchable={false}
                  value={accountStatus}
                />
              </ScopeField>
            ) : null}
          </>
        }
        tableActions={
          selectedTab === "manage" ? (
            <>
              <RefreshButton onRefresh={refetchAccounts} updatedAt={accountsUpdatedAt} />
              {selectedAccountIds.size > 0 ? (
                <Button
                  className="shrink-0"
                  icon={X}
                  onClick={() => setSelectedAccountIds(new Set())}
                  variant="ghost"
                >
                  ยกเลิกการเลือก
                </Button>
              ) : null}
              <Button
                className="w-[14rem] shrink-0 transform-none transition-none hover:shadow-sm active:scale-100 disabled:opacity-100"
                disabled={bulkReissueMutation.isPending}
                icon={KeyRound}
                onClick={() => void handleBulkReissueExpired()}
                variant="outline"
              >
                ออกรหัสใหม่ที่หมดอายุ
              </Button>
              <Button
                className="w-[14rem] shrink-0 transform-none bg-primary text-white shadow-sm transition-none hover:bg-primary hover:shadow-sm active:scale-100 disabled:bg-primary disabled:text-white disabled:opacity-100"
                disabled={selectedAccountIds.size === 0 || bulkReissueMutation.isPending}
                icon={KeyRound}
                onClick={() => void handleBulkReissueSelected()}
              >
                ออกรหัสที่เลือก{" "}
                <span className="inline-block min-w-8 text-left tabular-nums">
                  ({selectedAccountIds.size})
                </span>
              </Button>
            </>
          ) : selectedTab === "generate" ? (
            <>
              {selectedCandidateIds.size > 0 ? (
                <Button
                  icon={X}
                  onClick={cancelCandidateSelection}
                  variant="ghost"
                >
                  ยกเลิกการเลือก ({selectedCandidateIds.size})
                </Button>
              ) : null}
              <Button
                icon={Search}
                isLoading={previewMutation.isPending}
                loadingText="กำลังตรวจ"
                onClick={() => previewMutation.mutate(previewFilter)}
              >
                ดูตัวอย่าง
              </Button>
              <Button
                disabled={selectedCandidateIds.size === 0 || generateSelectedMutation.isPending}
                icon={UserPlus}
                isLoading={generateSelectedMutation.isPending}
                loadingText="กำลังสร้าง"
                onClick={() => void generateSelectedStudentAccounts()}
              >
                สร้างบัญชีที่เลือก ({selectedCandidateIds.size})
              </Button>
              <Button
                disabled={
                  !preview ||
                  preview.summary.withoutAccountCount === 0 ||
                  previewMutation.isPending ||
                  Boolean(debouncedCandidateSearch)
                }
                onClick={generateStudentAccounts}
                title={
                  debouncedCandidateSearch
                    ? "ล้างคำค้นหาก่อนสร้างทั้งหมดตามตัวกรอง"
                    : undefined
                }
                variant="outline"
              >
                สร้างทั้งหมดตามตัวกรอง
              </Button>
            </>
          ) : undefined
        }
      />

      {selectedTab === "manage" ? (
        <>
          <FormErrorAlert
            error={bulkReissueMutation.error}
            fallback="ออกรหัสชั่วคราวใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง"
          />
          <FormErrorAlert
            error={deactivateMutation.error}
            fallback="ปิดใช้งานบัญชีนักเรียนไม่สำเร็จ กรุณาลองอีกครั้ง"
          />
          <FormErrorAlert
            error={reactivateMutation.error}
            fallback="เปิดใช้งานบัญชีนักเรียนไม่สำเร็จ กรุณาลองอีกครั้ง"
          />
          {accountsError || lifecycleCatalog.isError ? (
            <ErrorState
              title="โหลดบัญชีนักเรียนไม่สำเร็จ"
              description="เกิดข้อผิดพลาดระหว่างโหลดรายการบัญชีนักเรียน"
              onRetry={() => {
                refetchAccounts();
                lifecycleCatalog.refetch();
              }}
            />
          ) : accountsLoading || lifecycleCatalog.isLoading ? (
            <SkeletonTable rows={3} />
          ) : (
            <div className="space-y-4">
              <SummaryMetrics
                centerRows
                items={[
                  {
                    label: "ทั้งหมด",
                    value: accountStatusTotal,
                    tone: "default",
                    icon: Users,
                    emphasis: true,
                    onSelect: () => {
                      setAccountStatus("");
                      resetManagementList();
                    },
                    selected: accountStatus === "",
                    selectionLabel: "แสดงบัญชีนักเรียนทุกสถานะ",
                  },
                  ...lifecycleCatalog.items.map((item) => ({
                    label: item.label,
                    value:
                      accountStatusCounts[item.code as StudentAccountManagementStatus] ?? 0,
                    tone: item.summaryTone ?? "default",
                    icon:
                      STUDENT_ACCOUNT_STATUS_ICONS[
                        item.code as keyof typeof STUDENT_ACCOUNT_STATUS_ICONS
                      ] ?? Users,
                    onSelect: () => {
                      setAccountStatus((current) =>
                        current === item.code
                          ? ""
                          : (item.code as StudentAccountManagementStatus),
                      );
                      resetManagementList();
                    },
                    selected: accountStatus === item.code,
                    selectionLabel: `${accountStatus === item.code ? "ยกเลิกตัวกรอง" : "กรอง"}${item.label}`,
                  })),
                ]}
              />
              <StudentAccountManagementTable
                onDeactivate={(row) => void handleDeactivateRow(row)}
                onReactivate={(row) => void handleReactivateRow(row)}
                onReissueTemporaryPassword={(row) =>
                  void handleReissueRow(row)
                }
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                pendingDeactivateIds={
                  deactivateMutation.isPending && deactivateMutation.variables
                    ? [deactivateMutation.variables.id]
                    : []
                }
                pendingReactivateIds={
                  reactivateMutation.isPending && reactivateMutation.variables
                    ? [reactivateMutation.variables]
                    : []
                }
                pendingReissueIds={
                  bulkReissueMutation.isPending
                    ? bulkReissueMutation.variables.userIds ?? selectedAccountIds
                    : []
                }
                rows={accounts}
                selectedIds={selectedAccountIds}
              />
              <Pagination
                // Keep the selection across pages so a bulk action can span
                // page 1 + page 2. It still resets on unmount (refresh /
                // leaving the page) and on any filter/search/status change.
                onPageChange={setManagementPage}
                onRowsPerPageChange={handleManagementRowsPerPageChange}
                page={accountsMeta?.page ?? managementPage}
                rowsPerPage={accountsMeta?.limit ?? managementRowsPerPage}
                rowsPerPageOptions={PREVIEW_PAGE_SIZE_OPTIONS}
                totalCount={accountsMeta?.totalCount ?? 0}
                unitLabel="บัญชี"
              />
            </div>
          )}

          {generatedCredentials.length > 0 ? (
            <div className="mt-5 space-y-4">
              <Alert variant="success">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>ออกรหัสใหม่แล้ว {generatedCredentials.length} บัญชี</AlertTitle>
                    <AlertDescription>
                      รหัสชั่วคราวแสดงเพียงครั้งเดียว คัดลอกหรือส่งออกผลลัพธ์ได้ทันที
                    </AlertDescription>
                  </div>
                  <TableActionBar className="min-h-0 shrink-0">
                    <Button icon={Copy} onClick={() => void copyCredentials()} variant="outline">
                      คัดลอกตาราง
                    </Button>
                    <Button icon={Download} onClick={() => void exportCredentials()} variant="outline">
                      ส่งออก CSV
                    </Button>
                  </TableActionBar>
                </div>
              </Alert>
              <CredentialTable credentials={generatedCredentials} />
            </div>
          ) : null}
        </>
      ) : selectedTab === "generate" ? (
        <>
          <FormErrorAlert
            error={generateSelectedMutation.error}
            fallback="สร้างบัญชีนักเรียนที่เลือกไม่สำเร็จ กรุณาลองอีกครั้ง"
          />
          {previewMutation.isError ? (
            <ErrorState
              title="ตรวจรายชื่อไม่สำเร็จ"
              description={getStudentAccountErrorMessage(previewMutation.error)}
              onRetry={() =>
                previewMutation.mutate(previewMutation.variables ?? previewFilter)
              }
            />
          ) : preview ? (
            <div className="space-y-5">
              <SummaryMetrics
                items={[
                  {
                    label: "ในขอบเขต",
                    value: preview.summary.totalCount,
                    tone: "info",
                    icon: Users,
                    emphasis: true,
                  },
                  {
                    label: "พร้อมสร้าง",
                    value: preview.summary.withoutAccountCount,
                    tone: "warning",
                    icon: UserPlus,
                  },
                  {
                    label: "มีบัญชีแล้ว",
                    value: preview.summary.existingAccountCount,
                    tone: "default",
                    icon: CheckCircle2,
                  },
                ]}
              />
              <CandidateTable
                candidates={preview.candidates}
                searchTerm={debouncedCandidateSearch}
                selectedIds={selectedCandidateIds}
                page={preview.meta?.page ?? previewPage}
                rowsPerPage={preview.meta?.limit ?? previewRowsPerPage}
                totalCount={preview.meta?.totalCount ?? preview.summary.withoutAccountCount}
                onSelectAll={handleSelectAllCandidates}
                onSelectRow={handleSelectCandidate}
                onPageChange={(nextPage) => {
                  setPreviewPage(nextPage);
                  previewMutation.mutate(
                    {
                      ...buildFilter(scope, area, previewRowsPerPage, nextPage),
                      searchTerm: debouncedCandidateSearch || undefined,
                    },
                  );
                }}
                onRowsPerPageChange={(nextRowsPerPage) => {
                  setPreviewRowsPerPage(nextRowsPerPage);
                  setPreviewPage(1);
                  previewMutation.mutate(
                    {
                      ...buildFilter(scope, area, nextRowsPerPage, 1),
                      searchTerm: debouncedCandidateSearch || undefined,
                    },
                  );
                }}
              />
            </div>
          ) : (
            <EmptyState
              description="เลือกโรงเรียน ชั้น และห้องด้านบน เพื่อดูตัวอย่างบัญชีที่จะสร้าง"
              icon={KeyRound}
              title="เลือกขอบเขตแล้วดูตัวอย่าง"
            />
          )}

          {createdCredentials.length > 0 ? (
            <div className="mt-5 space-y-4">
              <Alert variant="success">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>สร้างแล้ว {createdCredentials.length} บัญชี</AlertTitle>
                    <AlertDescription>
                      รหัสชั่วคราวแสดงเพียงครั้งเดียว คัดลอกหรือส่งออกผลลัพธ์ได้ทันที
                    </AlertDescription>
                  </div>
                  <TableActionBar className="min-h-0 shrink-0">
                    <Button
                      icon={Copy}
                      onClick={() => void copyCreatedCredentials()}
                      variant="outline"
                    >
                      คัดลอกตาราง
                    </Button>
                    <Button
                      icon={Download}
                      onClick={() => void exportCreatedCredentials()}
                      variant="outline"
                    >
                      ส่งออก CSV
                    </Button>
                  </TableActionBar>
                </div>
              </Alert>
              <CredentialTable credentials={createdCredentials} />
            </div>
          ) : null}

          <div className="mt-6">
            <StudentAccountBatchPanel
              filter={generateFilter}
              initialSelectedJobId={searchParams.get("jobId")}
              startRequestKey={batchStartRequestKey}
            />
          </div>
        </>
      ) : can("audit-log") ? (
        <AuditLogPanel
          domain="student_accounts"
          title="ประวัติบัญชีนักเรียน"
          description="ดูรายการสร้างบัญชีนักเรียนย้อนหลังตามขอบเขตสิทธิ์และโรงเรียนที่เลือก"
          province={generateFilter.province}
          district={generateFilter.district}
          subDistrict={generateFilter.subDistrict}
          schoolId={generateFilter.schoolId}
          detailTo={(entry) =>
            entry.action === "STUDENT_ACCOUNT_BATCH_ENQUEUE" && entry.targetId
              ? `/manage-student-accounts/generate?jobId=${encodeURIComponent(entry.targetId)}`
              : `/audit-log/${entry.id}`
          }
          showActionColumn
          showReferenceColumn={false}
        />
      ) : (
        <EmptyState
          description="บัญชีของคุณไม่มีสิทธิ์ดูบันทึกการใช้งาน"
          title="ไม่สามารถดูประวัติได้"
        />
      )}
      {confirmDialog}
      <AccountDeactivationDialog
        key={deactivationTarget?.userId ?? "none"}
        error={
          deactivateMutation.error
            ? getApiErrorMessage(
                deactivateMutation.error,
                "ปิดใช้งานบัญชีนักเรียนไม่สำเร็จ กรุณาลองอีกครั้ง",
              )
            : undefined
        }
        isSubmitting={deactivateMutation.isPending}
        onClose={() => setDeactivationTarget(null)}
        onSubmit={submitDeactivateStudentAccount}
        open={Boolean(deactivationTarget)}
        targetName={
          deactivationTarget
            ? `ต้องการปิดใช้งานบัญชีของ "${deactivationTarget.studentName}"`
            : ""
        }
      />
    </PageShell>
  );
}
