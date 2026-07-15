import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileDown,
  HeartHandshake,
  ListChecks,
} from "lucide-react";
import { Button, Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { CaseListFilter } from "../components/CaseListFilter";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTable } from "../components/CaseTable";
import { useCases } from "../hooks/useCases";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type {
  CaseListQuery,
  CaseRecord,
} from "../types/cases.types";

const CASE_STATUS_ICONS = {
  OPEN: AlertCircle,
  PENDING_REVIEW: ClipboardCheck,
  IN_PROGRESS: Clock,
  REPORTED_UP: HeartHandshake,
  RESOLVED: CheckCircle2,
} as const;

const CASE_TAB_ROUTES = {
  list: "/cases",
  history: "/cases/history",
} as const;

function getFallbackCaseStatusCounts(cases: readonly CaseRecord[]): Record<string, number> {
  return cases.reduce<Record<string, number>>(
    (counts, caseRecord) => {
      return {
        ...counts,
        [caseRecord.status]: (counts[caseRecord.status] ?? 0) + 1,
      };
    },
    {},
  );
}

function getInitialSearchQuery(state: unknown): string {
  if (!state || typeof state !== "object" || !("searchTerm" in state)) {
    return "";
  }
  const searchTerm = (state as { searchTerm?: unknown }).searchTerm;
  return typeof searchTerm === "string" ? searchTerm : "";
}

export function CasesListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(CASE_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = activeTab === "history" && canViewAuditLog ? "history" : "list";
  const [searchQuery, setSearchQuery] = useState(() => getInitialSearchQuery(location.state));
  const [status, setStatus] = useState(() => initialQuery.get("status") || "ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const schoolArea = useSchoolAreaFilter({
    province: initialQuery.get("province") || undefined,
    district: initialQuery.get("district") || undefined,
    subDistrict: initialQuery.get("subDistrict") || undefined,
  });
  const scope = useScopeCascade({
    lockToActorScope: true,
    initialSchoolId: initialQuery.get("schoolId") || undefined,
    initialGrade: initialQuery.get("grade") || undefined,
    initialRoom: initialQuery.get("room") || undefined,
  });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const filteredCasesExportUrl = buildDataExportContextUrl("case_summary", {
    province: schoolArea.province,
    district: schoolArea.district,
    subDistrict: schoolArea.subDistrict,
    schoolId: scope.schoolId,
    status: status === "ALL" ? undefined : status,
  });

  const query = useMemo<CaseListQuery>(
    () => ({
      status,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      status,
      schoolArea.province,
      schoolArea.district,
      schoolArea.subDistrict,
      scope.schoolId,
      scope.grade,
      scope.room,
      debouncedSearch,
      page,
      rowsPerPage,
    ],
  );

  const { cases, meta, isLoading, isError, refetch } = useCases(query);
  const workflowStatuses = useStatusCatalog("CASE_WORKFLOW");
  const statuses = workflowStatuses.items;
  const totalCount = meta?.totalCount ?? 0;
  const statusCounts = useMemo<Record<string, number>>(
    () => ({
      ...(meta?.statusCounts ?? getFallbackCaseStatusCounts(cases)),
    }),
    [cases, meta?.statusCounts],
  );
  const statusTotal = useMemo(
    () => statuses.reduce((total, item) => total + (statusCounts[item.code] ?? 0), 0),
    [statusCounts, statuses],
  );

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatus(value);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setPage(1);
  }

  function handleGradeChange(value: string): void {
    scope.setGrade(value);
    setPage(1);
  }

  function handleRoomChange(value: string): void {
    scope.setRoom(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    setStatus("ALL");
    schoolArea.setProvince("");
    scope.reset();
    setPage(1);
  }

  function openUpdate(caseRecord: CaseRecord): void {
    setSelectedCase(caseRecord);
    setDialogOpen(true);
  }

  function openCreateLink(caseRecord: CaseRecord): void {
    void navigate("/create/visit", {
      state: {
        prefill: {
          existing_case_id: String(caseRecord.id),
          student_id: caseRecord.student_id ?? null,
          student_name: caseRecord.student_name,
          student_school: caseRecord.student_school ?? null,
          student_address: caseRecord.student_address ?? null,
          reason_flagged: caseRecord.reason_flagged ?? caseRecord.reason ?? null,
        },
      },
    });
  }

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <CaseListFilter
          actions={
            canViewAuditLog ? (
              <Tabs
                aria-label="โหมดเคสช่วยเหลือ"
                onChange={setActiveTab}
                options={[
                  { value: "list", label: "รายการ" },
                  { value: "history", label: "ประวัติ" },
                ]}
                value={activeTab}
              />
            ) : undefined
          }
          exportAction={
            can("export-data") ? (
              <Button
                icon={FileDown}
                onClick={() => navigate(filteredCasesExportUrl)}
                variant="outline"
              >
                ส่งออกตามตัวกรองนี้
              </Button>
            ) : undefined
          }
          onRefresh={refetch}
          onClearFilters={handleClearFilters}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          searchQuery={searchQuery}
          schoolFilters={
            <SchoolClassRoomFilter
              area={schoolArea}
              onGradeChange={handleGradeChange}
              onRoomChange={handleRoomChange}
              onSchoolChange={handleSchoolChange}
              scope={scope}
            />
          }
          status={status}
          statuses={statuses}
        />
      ) : (
        <ListPageToolbar
          actions={
            <Tabs
              aria-label="โหมดเคสช่วยเหลือ"
              onChange={setActiveTab}
              options={[
                { value: "list", label: "รายการ" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          }
          description="ดูประวัติการช่วยเหลือ รายงานขึ้นส่วนกลาง และปิดเคสย้อนหลังตามขอบเขตสิทธิ์"
          filters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          icon={HeartHandshake}
          title="เคสช่วยเหลือนักเรียน"
        />
      )}

      {effectiveTab === "history" ? (
        <AuditLogPanel
          description="ดูประวัติการช่วยเหลือ รายงานขึ้นส่วนกลาง และปิดเคสย้อนหลังตามขอบเขตสิทธิ์"
          district={schoolArea.district || undefined}
          domain="cases"
          province={schoolArea.province || undefined}
          schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          title="ประวัติเคสช่วยเหลือนักเรียน"
        />
      ) : isError || workflowStatuses.isError ? (
        <ErrorState
          title="ไม่สามารถโหลดข้อมูลเคสได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดรายการเคส"
          onRetry={() => {
            refetch();
            workflowStatuses.refetch();
          }}
        />
      ) : isLoading || workflowStatuses.isLoading ? (
        <SkeletonTable />
      ) : (
        <div className="space-y-4">
          <SummaryMetrics
            centerRows
            items={[
              {
                label: "ทั้งหมด",
                value: statusTotal,
                tone: "default",
                icon: ListChecks,
                emphasis: true,
                onSelect: () => handleStatusChange("ALL"),
                selected: status === "ALL",
                selectionLabel: "แสดงเคสทุกสถานะ",
              },
              ...statuses.map((item) => ({
                label: item.label,
                value: statusCounts[item.code] ?? 0,
                tone: item.summaryTone ?? undefined,
                icon: CASE_STATUS_ICONS[item.code as keyof typeof CASE_STATUS_ICONS] ?? ListChecks,
                onSelect: () =>
                  handleStatusChange(status === item.code ? "ALL" : item.code),
                selected: status === item.code,
                selectionLabel: `${status === item.code ? "ยกเลิกตัวกรอง" : "กรอง"}${item.label}`,
              })),
            ]}
          />
          {cases.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="ไม่พบเคสช่วยเหลือ"
              description="ลองปรับตัวกรองสถานะ หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
            />
          ) : (
            <>
              <CaseTable onCreateLink={openCreateLink} onUpdate={openUpdate} rows={cases} />
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={totalCount}
                unitLabel="เคส"
              />
            </>
          )}
        </div>
      )}

      <CaseStatusUpdateDialog
        key={selectedCase?.id ?? "none"}
        caseRecord={selectedCase}
        onOpenChange={setDialogOpen}
        onUpdated={() => void refetch()}
        open={dialogOpen}
      />
    </PageShell>
  );
}
