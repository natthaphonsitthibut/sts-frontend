import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Plus } from "lucide-react";
import { Button } from "../../../components/base";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { NavButton } from "../../../components/layout/nav-button";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import {
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { casesService } from "../../cases/api/cases.service";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import type { CaseListQuery } from "../../cases/types/cases.types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDate } from "../lib/task-presentation";
import { DASHBOARD_CASE_STATUS_OPTIONS } from "../lib/task-options";

export function DashboardPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const query = useMemo<CaseListQuery>(
    () => ({
      status,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, debouncedSearch, page, rowsPerPage],
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

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function handleRefresh(): void {
    void casesQuery.refetch();
    void statsQuery.refetch();
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
            <DataTable
              headings={["นักเรียน", "สาเหตุ", "สถานะ", "วันที่", "จัดการ"]}
              responsive={false}
              footer={
                cases.length === 0 ? (
                  <div className="border-t border-slate-100 py-12 text-center text-slate-500">
                    ไม่พบรายการตามตัวกรอง
                  </div>
                ) : null
              }
            >
              {cases.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>
                    <div className="font-bold text-slate-900">{item.student_name}</div>
                    <div className="text-xs text-slate-500">{item.student_school || "-"}</div>
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-600">
                    {item.reason_flagged || item.reason || "-"}
                  </DataTableCell>
                  <DataTableCell>
                    <CaseStatusBadge status={item.status} />
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-500">
                    {formatDate(item.created_at)}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    {item.task_id ? (
                      // Same min width as the "สร้างลิงก์" button so the action column
                      // stays one uniform width whichever action a row shows.
                      <DetailLinkButton className="min-w-[140px]" to={`/task-detail/${item.task_id}`} />
                    ) : (
                      <Button
                        className="min-w-[140px]"
                        icon={Plus}
                        onClick={() =>
                          void navigate("/create/visit", {
                            state: {
                              prefill: {
                                existing_case_id: String(item.id),
                                student_id: item.student_id ?? null,
                                student_name: item.student_name,
                                student_school: item.student_school ?? null,
                                student_address: item.student_address ?? null,
                                reason_flagged: item.reason_flagged ?? item.reason ?? null,
                              },
                            },
                          })
                        }
                        size="sm"
                      >
                        สร้างลิงก์
                      </Button>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
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
    </PageShell>
  );
}
