import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Search,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { riskDashboardService } from "../api/risk-dashboard.service";
import type {
  RiskDashboardQuery,
  RiskDashboardRow,
  RiskDashboardSortBy,
  RiskDashboardTier,
  RiskDashboardTierFilter,
  RiskDashboardThresholds,
} from "../types/risk-dashboard.types";

const RISK_TIER_PRESENTATION: Record<
  RiskDashboardTier,
  {
    label: string;
    badge: "default" | "secondary" | "destructive" | "success" | "warning";
    tone: "default" | "success" | "warning" | "danger" | "info";
    icon: LucideIcon;
  }
> = {
  HIGH: { label: "เสี่ยงสูง", badge: "destructive", tone: "danger", icon: Siren },
  MEDIUM: { label: "เสี่ยงกลาง", badge: "warning", tone: "warning", icon: ShieldAlert },
  LOW: { label: "เสี่ยงต่ำ", badge: "default", tone: "info", icon: AlertCircle },
  WATCH: { label: "เฝ้าระวัง", badge: "secondary", tone: "default", icon: Activity },
  NORMAL: { label: "ปกติ", badge: "success", tone: "success", icon: CheckCircle2 },
};

const RISK_FILTER_OPTIONS: Array<{ value: RiskDashboardTierFilter; label: string }> = [
  { value: "ALL", label: "ทุกระดับ" },
  { value: "HIGH", label: "เสี่ยงสูง" },
  { value: "MEDIUM", label: "เสี่ยงกลาง" },
  { value: "LOW", label: "เสี่ยงต่ำ" },
  { value: "WATCH", label: "เฝ้าระวัง" },
  { value: "NORMAL", label: "ปกติ" },
];

const SORT_KEY_MAP: Partial<Record<string, RiskDashboardSortBy>> = {
  risk: "risk",
  name: "name",
  school: "school",
  grade: "grade",
  room: "room",
  attendance: "attendance",
};

function formatNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toLocaleString() : "-";
}

function formatPercent(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

function criteriaText(thresholds?: RiskDashboardThresholds): string {
  if (!thresholds) return "กำลังโหลดเกณฑ์";
  const watchPercent = Math.round(thresholds.watchProgressRatio * 100);
  return [
    `ขาดติดกัน ต่ำ/กลาง/สูง ≥${thresholds.lowConsecutiveAbsentDays}/${thresholds.mediumConsecutiveAbsentDays}/${thresholds.highConsecutiveAbsentDays} วัน`,
    `เฝ้าระวัง ≥${watchPercent}% ของเกณฑ์`,
    `เวลาเรียนถ่วงน้ำหนัก ต่ำกว่า ${thresholds.lowAttendancePercent}/${thresholds.mediumAttendancePercent}/${thresholds.highAttendancePercent}%`,
    `สาย ${1 / thresholds.lateWeight} ครั้ง = ขาด 1 วัน`,
  ].join(" · ");
}

function RiskBadge({ tier }: { tier: RiskDashboardTier }) {
  const presentation = RISK_TIER_PRESENTATION[tier];
  return <Badge variant={presentation.badge}>{presentation.label}</Badge>;
}

function StudentCell({ row }: { row: RiskDashboardRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary">
        {row.studentName[0] || "?"}
      </div>
      <div className="min-w-0">
        <div className="truncate font-bold text-slate-800">{row.studentName}</div>
        <div className="text-xs font-semibold text-slate-500">
          {row.schoolName || "-"} · {row.grade || "-"} · ห้อง {row.room || "-"}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [riskTier, setRiskTier] = useState<RiskDashboardTierFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState>({ key: "risk", direction: "desc" });
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const sortBy = SORT_KEY_MAP[sort.key] ?? "risk";

  const query = useMemo<RiskDashboardQuery>(
    () => ({
      riskTier,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
      sortBy,
      sortDirection: sort.direction,
    }),
    [
      riskTier,
      schoolArea.province,
      schoolArea.district,
      schoolArea.subDistrict,
      scope.schoolId,
      scope.grade,
      scope.room,
      debouncedSearch,
      page,
      rowsPerPage,
      sortBy,
      sort.direction,
    ],
  );

  const riskQuery = useQuery({
    queryKey: ["risk-dashboard", query],
    queryFn: () => riskDashboardService.getRiskDashboard(query),
    placeholderData: keepPreviousData,
  });

  const rows = riskQuery.data?.items ?? [];
  const meta = riskQuery.data?.meta;
  const totalCount = meta?.totalCount ?? 0;

  const summaryItems = (Object.keys(RISK_TIER_PRESENTATION) as RiskDashboardTier[]).map((tier) => {
    const presentation = RISK_TIER_PRESENTATION[tier];
    return {
      label: (
        <button
          className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => handleSummaryFilter(tier)}
          type="button"
        >
          {presentation.label}
        </button>
      ),
      value: meta?.summary?.[tier]?.toLocaleString() ?? 0,
      tone: presentation.tone,
      icon: presentation.icon,
    };
  });

  function resetPage(): void {
    setPage(1);
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
    resetPage();
  }

  function handleRiskChange(value: string): void {
    setRiskTier(value as RiskDashboardTierFilter);
    resetPage();
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    resetPage();
  }

  function handleGradeChange(value: string): void {
    scope.setGrade(value);
    resetPage();
  }

  function handleRoomChange(value: string): void {
    scope.setRoom(value);
    resetPage();
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    resetPage();
  }

  function handleSortChange(nextSort: DataTableSortState | undefined): void {
    setSort(nextSort ?? { key: "risk", direction: "desc" });
    resetPage();
  }

  function handleSummaryFilter(tier: RiskDashboardTier): void {
    setRiskTier(tier);
    resetPage();
  }

  function openStudent(studentId: string): void {
    void navigate(`/students/${studentId}`);
  }

  return (
    <PageShell>
      <ListPageToolbar
        icon={LayoutDashboard}
        title="รายงานนักเรียน"
        description="ติดตามนักเรียนทุกคนในขอบเขตข้อมูล เรียงตามระดับความเสี่ยงจากการมาเรียน"
        tableActions={<RefreshButton onRefresh={() => void riskQuery.refetch()} />}
        search={{
          value: search,
          onChange: handleSearchChange,
          placeholder: "ค้นหาชื่อนักเรียนหรือรหัส",
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
              ariaLabel="ระดับความเสี่ยง"
              className="sm:w-[180px]"
              onChange={handleRiskChange}
              value={riskTier}
            >
              {RISK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </>
        }
      />

      <div className="space-y-5">
        <SummaryMetrics
          centerRows
          items={summaryItems}
        />

        <div className="rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
          เกณฑ์ปัจจุบัน: {criteriaText(meta?.thresholds)}
        </div>

        {riskQuery.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดรายงานนักเรียนได้"
            description="ตรวจสอบการเชื่อมต่อ backend แล้วลองอีกครั้ง"
            onRetry={() => void riskQuery.refetch()}
          />
        ) : riskQuery.isLoading ? (
          <SkeletonTable />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Search}
            title="ไม่พบข้อมูลนักเรียน"
            description="ลองปรับตัวกรองหรือคำค้นหา"
          />
        ) : (
          <div className="flex flex-col gap-2">
            <DataTable
              columnWidths={["w-[24%]", "w-[16%]", "w-[11%]", "w-[11%]", "w-[14%]", "w-[12%]", "w-[12%]"]}
              headings={[
                { label: "นักเรียน", sortKey: "name" },
                { label: "โรงเรียน", sortKey: "school" },
                { label: "ชั้น", sortKey: "grade" },
                { label: "ห้อง", sortKey: "room" },
                { label: "การมาเรียน", sortKey: "attendance" },
                { label: "เคสเปิด" },
                { label: "ระดับ", sortKey: "risk" },
              ]}
              minWidthClassName="min-w-[1080px]"
              onSortChange={handleSortChange}
              sort={sort}
            >
              {rows.map((row) => (
                <DataTableRow
                  key={row.studentId}
                  className="cursor-pointer"
                  onClick={() => openStudent(row.studentId)}
                >
                  <DataTableCell>
                    <StudentCell row={row} />
                  </DataTableCell>
                  <DataTableCell className="font-semibold text-slate-600">
                    {row.schoolName || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-center font-bold text-slate-600">
                    {row.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-center font-bold text-slate-600">
                    {row.room || "-"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-slate-800">
                        {formatPercent(row.weightedAttendancePercent)}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        ขาดติดกัน {row.consecutiveAbsentDays}/{meta?.thresholds.lowConsecutiveAbsentDays ?? "-"} · ขาด {formatNumber(row.absentDays)} · สาย {formatNumber(row.lateCount)}
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-center font-bold text-slate-700">
                    {formatNumber(row.openCaseCount)}
                  </DataTableCell>
                  <DataTableCell>
                    <RiskBadge tier={row.riskTier} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>

            <TableCardList>
              {rows.map((row) => (
                <TableCard
                  key={row.studentId}
                  interactive
                  className="flex flex-col gap-3 transition-colors hover:border-slate-300"
                  onClick={() => openStudent(row.studentId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <StudentCell row={row} />
                    <RiskBadge tier={row.riskTier} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">การมาเรียน</div>
                      <div className="font-bold text-slate-800">
                        {formatPercent(row.weightedAttendancePercent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">เคสเปิด</div>
                      <div className="font-bold text-slate-800">{formatNumber(row.openCaseCount)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">ขาดติดกัน</div>
                      <div className="font-bold text-slate-800">
                        {row.consecutiveAbsentDays}/{meta?.thresholds.lowConsecutiveAbsentDays ?? "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">ขาด/สาย</div>
                      <div className="font-bold text-slate-800">
                        {formatNumber(row.absentDays)} / {formatNumber(row.lateCount)}
                      </div>
                    </div>
                  </div>
                </TableCard>
              ))}
            </TableCardList>

            <Pagination
              onPageChange={setPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              totalCount={totalCount}
              unitLabel="คน"
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
