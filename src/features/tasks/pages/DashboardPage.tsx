import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Plus } from "lucide-react";
import { Badge } from "../../../components/base";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { casesService } from "../../cases/api/cases.service";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { useQuery } from "@tanstack/react-query";
import {
  formatDate,
} from "../lib/task-presentation";
import { DASHBOARD_CASE_STATUS_OPTIONS } from "../lib/task-options";

export function DashboardPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const casesQuery = useQuery({
    queryKey: ["task-dashboard-cases"],
    queryFn: casesService.getCases,
  });

  const cases = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);
  // Stat cards mirror the dropdown exactly — one card per status option, counts
  // derived from the same DASHBOARD_CASE_STATUS_OPTIONS source.
  const summaryItems = useMemo(
    () =>
      DASHBOARD_CASE_STATUS_OPTIONS.map((option) => ({
        label: option.label,
        value:
          option.value === "ALL"
            ? cases.length
            : cases.filter((item) => item.status === option.value).length,
        tone: option.tone,
      })),
    [cases],
  );

  const filteredCases = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return cases.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (!normalized) return true;
      return item.student_name.toLowerCase().includes(normalized);
    });
  }, [cases, search, status]);

  return (
    <PageShell>
      <PageToolbar
        icon={LayoutDashboard}
        title="แดชบอร์ดติดตามเคสนักเรียน"
        description="ติดตามสถานะเคสและลิงก์ภารกิจจากข้อมูล backend ปัจจุบัน"
        actions={
          <div className="flex gap-2">
            <RefreshButton onRefresh={() => casesQuery.refetch()} />
            <NavButton icon={Plus} to="/create" variant="secondary">
              สร้างภารกิจใหม่
            </NavButton>
          </div>
        }
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearch}
            placeholder="ค้นหาชื่อนักเรียน"
            value={search}
          />
          <FilterSelect
            ariaLabel="สถานะเคส"
            className="sm:w-[220px]"
            onChange={setStatus}
            value={status}
          >
            {DASHBOARD_CASE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </ToolbarControls>
      </PageToolbar>

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
          <DataTable
            headings={["นักเรียน", "สาเหตุ", "สถานะ", "วันที่", "ภารกิจ"]}
            responsive={false}
            footer={
              filteredCases.length === 0 ? (
                <div className="border-t border-slate-100 py-12 text-center text-slate-500">
                  ไม่พบรายการตามตัวกรอง
                </div>
              ) : null
            }
          >
            {filteredCases.map((item) => (
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
                    <Link className="font-semibold text-primary" to={`/task-detail/${item.task_id}`}>
                      ดูรายละเอียด
                    </Link>
                  ) : (
                    <Badge variant="secondary">ยังไม่มีลิงก์</Badge>
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
        )}
      </div>
    </PageShell>
  );
}
