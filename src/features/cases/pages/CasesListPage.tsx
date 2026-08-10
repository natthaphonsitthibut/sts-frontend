import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileDown,
  UserRoundX,
} from "lucide-react";
import { Button, Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { CaseListFilter } from "../components/CaseListFilter";
import { CaseTable } from "../components/CaseTable";
import { TeacherWatchlistTable } from "../components/TeacherWatchlistTable";
import { useCases } from "../hooks/useCases";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { useTeacherWatchlist } from "../../student-observations/hooks/useStudentObservations";
import type { CaseListQuery, CaseRecord } from "../types/cases.types";

const CASE_STATUS_ICONS = {
  OPEN: AlertCircle,
  PENDING_REVIEW: ClipboardCheck,
  IN_PROGRESS: Clock,
  STUDENT_NOT_FOUND: UserRoundX,
} as const;

const SUMMARY_STATUS_CODES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "STUDENT_NOT_FOUND",
] as const;

const CASE_TAB_ROUTES = {
  list: "/cases",
  history: "/cases/history",
} as const;

type CaseGroup = "risk" | "watchlist";

function getFallbackCaseStatusCounts(
  cases: readonly CaseRecord[],
): Record<string, number> {
  return cases.reduce<Record<string, number>>((counts, caseRecord) => {
    return {
      ...counts,
      [caseRecord.status]: (counts[caseRecord.status] ?? 0) + 1,
    };
  }, {});
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
  const contextualNavigate = useContextualNavigate();
  const location = useLocation();
  const initialQuery = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(CASE_TAB_ROUTES, "list");
  const canViewHistory = can("review-cases");
  const canViewWatchlist =
    can("review-cases") && can("manage-student-observations");
  const effectiveTab =
    activeTab === "history" && canViewHistory ? "history" : "list";
  const [caseGroup, setCaseGroup] = useState<CaseGroup>("risk");
  const [searchQuery, setSearchQuery] = useState(() =>
    getInitialSearchQuery(location.state),
  );
  const [status, setStatus] = useState(
    () => initialQuery.get("status") || "ALL",
  );
  const [riskPage, setRiskPage] = useState(1);
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
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
      page: riskPage,
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
      riskPage,
      rowsPerPage,
    ],
  );

  const { cases, meta, isLoading, isError, refetch, dataUpdatedAt } =
    useCases(query);
  const watchlist = useTeacherWatchlist(
    {
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page: watchlistPage,
      limit: rowsPerPage,
    },
    effectiveTab === "list" && caseGroup === "watchlist" && canViewWatchlist,
  );
  const workflowStatuses = useStatusCatalog("CASE_WORKFLOW");
  const statuses = workflowStatuses.items;
  const totalCount = meta?.totalCount ?? 0;
  const statusCounts = useMemo<Record<string, number>>(
    () => ({
      ...(meta?.statusCounts ?? getFallbackCaseStatusCounts(cases)),
    }),
    [cases, meta?.statusCounts],
  );
  const summaryStatuses = useMemo(
    () =>
      SUMMARY_STATUS_CODES.map((code) =>
        statuses.find((item) => item.code === code),
      ).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [statuses],
  );

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleStatusChange(value: string): void {
    setCaseGroup("risk");
    setStatus(value);
    setRiskPage(1);
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleGradeChange(value: string): void {
    scope.setGrade(value);
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleRoomChange(value: string): void {
    scope.setRoom(value);
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    setStatus("ALL");
    schoolArea.setProvince("");
    scope.reset();
    setRiskPage(1);
    setWatchlistPage(1);
  }

  function handleCaseGroupChange(value: string): void {
    if (value === "watchlist" && canViewWatchlist) {
      setCaseGroup("watchlist");
      return;
    }
    setCaseGroup("risk");
  }

  async function refreshActiveList(): Promise<void> {
    if (caseGroup === "watchlist" && canViewWatchlist) {
      await Promise.all([refetch(), watchlist.refetch()]);
      return;
    }
    await refetch();
  }

  function openCreateLink(caseRecord: CaseRecord): void {
    contextualNavigate("/create/visit", {
      state: {
        prefill: {
          existing_case_id: String(caseRecord.id),
          student_id: caseRecord.student_id ?? null,
          student_name: caseRecord.student_name,
          student_school: caseRecord.student_school ?? null,
          student_address: caseRecord.student_address ?? null,
          reason_flagged:
            caseRecord.reason_flagged ?? caseRecord.reason ?? null,
        },
      },
    });
  }

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <CaseListFilter
          navigation={
            canViewHistory ? (
              <Tabs
                aria-label="มุมมองเคสติดตามนักเรียน"
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
            caseGroup === "risk" && can("export-data") ? (
              <Button
                icon={FileDown}
                onClick={() => navigate(filteredCasesExportUrl)}
                variant="outline"
              >
                ส่งออกตามตัวกรองนี้
              </Button>
            ) : undefined
          }
          onRefresh={refreshActiveList}
          updatedAt={
            caseGroup === "watchlist"
              ? Math.max(dataUpdatedAt, watchlist.dataUpdatedAt)
              : dataUpdatedAt
          }
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
          showStatusFilter={caseGroup === "risk"}
        />
      ) : (
        <CaseListFilter
          navigation={
            <Tabs
              aria-label="มุมมองเคสติดตามนักเรียน"
              onChange={setActiveTab}
              options={[
                { value: "list", label: "รายการ" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          }
          onRefresh={refetch}
          updatedAt={dataUpdatedAt}
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
      )}

      {isError || workflowStatuses.isError ? (
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
      ) : effectiveTab === "history" ? (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบประวัติเคสติดตามนักเรียน"
              description="ลองปรับตัวกรองสถานะ หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
            />
          ) : (
            <>
              <CaseTable canCreateLinks={false} onCreateLink={openCreateLink} rows={cases} />
              <Pagination
                onPageChange={setRiskPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                page={riskPage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={totalCount}
                unitLabel="เคส"
              />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <SummaryMetrics
            columns={4}
            items={[
              ...summaryStatuses.map((item) => ({
                label: item.label,
                value: statusCounts[item.code] ?? 0,
                tone: item.summaryTone ?? undefined,
                icon: CASE_STATUS_ICONS[
                  item.code as keyof typeof CASE_STATUS_ICONS
                ],
                onSelect: () =>
                  handleStatusChange(status === item.code ? "ALL" : item.code),
                selected: status === item.code,
                selectionLabel: `${status === item.code ? "ยกเลิกตัวกรอง" : "กรอง"}${item.label}`,
              })),
            ]}
          />
          {canViewWatchlist ? (
            <Tabs
              aria-label="กลุ่มนักเรียนในหน้าเคสติดตาม"
              className="w-full"
              onChange={handleCaseGroupChange}
              options={[
                { value: "risk", label: "กลุ่มเสี่ยง" },
                { value: "watchlist", label: "กลุ่มเฝ้าระวัง" },
              ]}
              value={caseGroup}
            />
          ) : null}

          {caseGroup === "watchlist" && canViewWatchlist ? (
            watchlist.isLoading ? (
              <SkeletonTable />
            ) : watchlist.isError ? (
              <ErrorState
                title="ไม่สามารถโหลดกลุ่มเฝ้าระวังได้"
                description="เกิดข้อผิดพลาดระหว่างโหลดความคิดเห็นจากคุณครู"
                onRetry={() => void watchlist.refetch()}
              />
            ) : (watchlist.data?.data.length ?? 0) === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="ไม่พบนักเรียนกลุ่มเฝ้าระวัง"
                description="นักเรียนที่มีความคิดเห็นจากครูประจำห้องจะแสดงในส่วนนี้"
              />
            ) : (
              <>
                <TeacherWatchlistTable rows={watchlist.data?.data ?? []} />
                <Pagination
                  onPageChange={setWatchlistPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  page={watchlistPage}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                  totalCount={watchlist.data?.meta.totalCount ?? 0}
                  unitLabel="คน"
                />
              </>
            )
          ) : cases.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบเคสติดตามนักเรียน"
              description="ลองปรับตัวกรองสถานะ หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
            />
          ) : (
            <>
              <CaseTable
                canCreateLinks={can("create")}
                onCreateLink={openCreateLink}
                rows={cases}
              />
              <Pagination
                onPageChange={setRiskPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                page={riskPage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={totalCount}
                unitLabel="เคส"
              />
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}
