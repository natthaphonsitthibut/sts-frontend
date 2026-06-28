import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  Plus,
} from "lucide-react";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { casesService } from "../../cases/api/cases.service";
import { CaseStatusUpdateDialog } from "../../cases/components/CaseStatusUpdateDialog";
import { CaseTable } from "../../cases/components/CaseTable";
import type { CaseListQuery, CaseRecord } from "../../cases/types/cases.types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DASHBOARD_CASE_STATUS_OPTIONS } from "../lib/task-options";

const CASE_STATUS_SUMMARY_ICONS = {
  ALL: ListChecks,
  OPEN: AlertCircle,
  IN_PROGRESS: Clock,
  PENDING_REVIEW: ClipboardCheck,
  AWAITING_HELP: HeartHandshake,
  RESOLVED: CheckCircle2,
} as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const query = useMemo<CaseListQuery>(
    () => ({
      status,
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, scope.schoolId, scope.grade, scope.room, debouncedSearch, page, rowsPerPage],
  );

  const casesQuery = useQuery({
    queryKey: ["task-dashboard-cases", query],
    queryFn: () => casesService.getCases(query),
    placeholderData: keepPreviousData,
  });

  // Summary cards use server-computed, scope-aware counts so they stay accurate
  // independent of the current page/filter.
  const statsQuery = useQuery({
    queryKey: ["task-dashboard-stats"],
    queryFn: casesService.getCaseStats,
  });

  const cases = casesQuery.data?.items ?? [];
  const totalCount = casesQuery.data?.meta?.totalCount ?? 0;

  const summaryItems = useMemo(() => {
    const stats = statsQuery.data;
    const countByStatus: Record<string, number> = {
      ALL: stats?.total ?? 0,
      OPEN: stats?.open ?? 0,
      IN_PROGRESS: stats?.inProgress ?? 0,
      PENDING_REVIEW: stats?.pendingReview ?? 0,
      AWAITING_HELP: stats?.awaitingHelp ?? 0,
      RESOLVED: stats?.resolved ?? 0,
    };
    return DASHBOARD_CASE_STATUS_OPTIONS.map((option) => ({
      label: option.label,
      value: countByStatus[option.value] ?? 0,
      tone: option.tone,
      icon: CASE_STATUS_SUMMARY_ICONS[option.value],
    }));
  }, [statsQuery.data]);

  function handleSearchChange(value: string): void {
    setSearch(value);
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

  function handleRefresh(): void {
    void casesQuery.refetch();
    void statsQuery.refetch();
  }

  function handleUpdated(): void {
    handleRefresh();
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
      <ListPageToolbar
        icon={LayoutDashboard}
        title="รายงานนักเรียน"
        description="ติดตามสถานะเคสและลิงก์ภารกิจจากข้อมูล backend ปัจจุบัน"
        actions={
          <div className="flex gap-2">
            <RefreshButton onRefresh={handleRefresh} />
            <NavButton icon={Plus} to="/create">
              สร้างภารกิจใหม่
            </NavButton>
          </div>
        }
        search={{
          value: search,
          onChange: handleSearchChange,
          placeholder: "ค้นหาชื่อนักเรียน",
        }}
        filters={
          <>
            <SchoolClassRoomFilter
              area={schoolArea}
              onGradeChange={handleGradeChange}
              onRoomChange={handleRoomChange}
              onSchoolChange={handleSchoolChange}
              scope={scope}
            />
            <FilterSelect
              ariaLabel="สถานะเคส"
              className="sm:w-[220px]"
              onChange={handleStatusChange}
              value={status}
            >
              {DASHBOARD_CASE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </>
        }
      />

      <div className="space-y-5">
        <SummaryMetrics items={summaryItems} />

        {casesQuery.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดข้อมูลเคสได้"
            description="ตรวจสอบการเชื่อมต่อ backend แล้วลองอีกครั้ง"
            onRetry={() => void casesQuery.refetch()}
          />
        ) : casesQuery.isLoading ? (
          <SkeletonTable />
        ) : (
          <>
            {cases.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white py-12 text-center text-slate-500">
                ไม่พบรายการตามตัวกรอง
              </div>
            ) : (
              <CaseTable
                canReviewCases={can("review-cases")}
                onCreateLink={openCreateLink}
                onUpdate={openUpdate}
                rows={cases}
              />
            )}
            {cases.length > 0 ? (
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={totalCount}
                unitLabel="เคส"
              />
            ) : null}
          </>
        )}
      </div>

      <CaseStatusUpdateDialog
        key={selectedCase?.id ?? "none"}
        caseRecord={selectedCase}
        onOpenChange={setDialogOpen}
        onUpdated={handleUpdated}
        open={dialogOpen}
      />
    </PageShell>
  );
}
