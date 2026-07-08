import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Plus,
  Search,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
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
import { StudentAvatar } from "../../students/components/StudentAvatar";
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
  openCases: "openCases",
};

type RiskSortOptionValue = "default" | `${RiskDashboardSortBy}:asc` | `${RiskDashboardSortBy}:desc`;
const DEFAULT_RISK_SORT: DataTableSortState = { key: "risk", direction: "desc" };

const RISK_SORT_OPTIONS: Array<{
  value: RiskSortOptionValue;
  label: string;
  sort?: DataTableSortState;
}> = [
  { value: "default", label: "ค่าเริ่มต้น: ระดับเสี่ยง มาก → น้อย" },
  { value: "risk:desc", label: "ระดับเสี่ยง มาก → น้อย", sort: { key: "risk", direction: "desc" } },
  { value: "risk:asc", label: "ระดับเสี่ยง น้อย → มาก", sort: { key: "risk", direction: "asc" } },
  { value: "name:asc", label: "ชื่อนักเรียน ก → ฮ", sort: { key: "name", direction: "asc" } },
  { value: "name:desc", label: "ชื่อนักเรียน ฮ → ก", sort: { key: "name", direction: "desc" } },
  { value: "school:asc", label: "โรงเรียน ก → ฮ", sort: { key: "school", direction: "asc" } },
  { value: "grade:asc", label: "ชั้น น้อย → มาก", sort: { key: "grade", direction: "asc" } },
  { value: "room:asc", label: "ห้อง น้อย → มาก", sort: { key: "room", direction: "asc" } },
  { value: "attendance:asc", label: "การมาเรียน ต่ำ → สูง", sort: { key: "attendance", direction: "asc" } },
  { value: "attendance:desc", label: "การมาเรียน สูง → ต่ำ", sort: { key: "attendance", direction: "desc" } },
  { value: "openCases:desc", label: "เคสเปิด มาก → น้อย", sort: { key: "openCases", direction: "desc" } },
  { value: "openCases:asc", label: "เคสเปิด น้อย → มาก", sort: { key: "openCases", direction: "asc" } },
];

function sortToValue(sort: DataTableSortState | undefined): RiskSortOptionValue {
  if (!sort) return "default";
  const sortBy = SORT_KEY_MAP[sort.key] ?? "risk";
  return `${sortBy}:${sort.direction}`;
}

function formatNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toLocaleString() : "-";
}

function formatPercent(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

function criteriaItems(thresholds?: RiskDashboardThresholds): Array<{ label: string; value: string }> {
  if (!thresholds) return [{ label: "สถานะ", value: "กำลังโหลดเกณฑ์" }];
  const watchPercent = Math.round(thresholds.watchProgressRatio * 100);
  return [
    {
      label: "ขาดติดกัน ต่ำ/กลาง/สูง",
      value: `≥${thresholds.lowConsecutiveAbsentDays}/${thresholds.mediumConsecutiveAbsentDays}/${thresholds.highConsecutiveAbsentDays} วัน`,
    },
    { label: "เฝ้าระวัง", value: `≥${watchPercent}% ของเกณฑ์` },
    {
      label: "เวลาเรียนถ่วงน้ำหนัก",
      value: `ต่ำกว่า ${thresholds.lowAttendancePercent}/${thresholds.mediumAttendancePercent}/${thresholds.highAttendancePercent}%`,
    },
    { label: "สายเทียบขาด", value: `สาย ${1 / thresholds.lateWeight} ครั้ง = ขาด 1 วัน` },
    {
      label: "สายรายวิชา",
      value: `≥${thresholds.subjectLateWatchCount} ครั้งใน ${thresholds.subjectLateWindowDays} วัน = เฝ้าระวัง`,
    },
  ];
}

function RiskBadge({ tier }: { tier: RiskDashboardTier }) {
  const presentation = RISK_TIER_PRESENTATION[tier];
  return <Badge variant={presentation.badge}>{presentation.label}</Badge>;
}

function StudentCell({ row }: { row: RiskDashboardRow }) {
  return (
    <div className="flex items-center gap-3">
      <StudentAvatar name={row.studentName} />
      <div className="min-w-0">
        <div className="truncate font-bold text-slate-800">{row.studentName}</div>
      </div>
    </div>
  );
}

function DashboardRowAction({ row }: { row: RiskDashboardRow }) {
  const navigate = useNavigate();

  if (row.latestOpenTaskId) {
    return (
      <DetailLinkButton
        className="w-[112px]"
        onClick={(event) => event.stopPropagation()}
        to={`/task-detail/${row.latestOpenTaskId}`}
        variant="default"
      >
        ดูเคส
      </DetailLinkButton>
    );
  }

  if (row.latestOpenCaseId) {
    return (
      <Button
        className="w-[112px]"
        icon={Plus}
        onClick={(event) => {
          event.stopPropagation();
          void navigate("/create/visit", {
            state: {
              prefill: {
                existing_case_id: String(row.latestOpenCaseId),
                student_id: row.studentId,
                student_name: row.studentName,
                student_school: row.schoolName,
                reason_flagged: row.latestOpenCaseReason,
              },
            },
          });
        }}
        size="sm"
      >
        สร้างลิงก์
      </Button>
    );
  }

  return (
    <DetailLinkButton
      className="w-[112px]"
      onClick={(event) => event.stopPropagation()}
      to={`/students/${row.studentId}`}
    >
      ดูโปรไฟล์
    </DetailLinkButton>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [riskTier, setRiskTier] = useState<RiskDashboardTierFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>(DEFAULT_RISK_SORT);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const sortBy = sort ? SORT_KEY_MAP[sort.key] : undefined;

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
      sortDirection: sort?.direction,
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
      sort?.direction,
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
    setSort(nextSort);
    resetPage();
  }

  function handleMobileSortChange(value: string): void {
    const nextSort = RISK_SORT_OPTIONS.find((option) => option.value === value)?.sort;
    setSort(nextSort);
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

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">เกณฑ์ปัจจุบัน</h2>
            <Badge variant="secondary">ใช้จัดระดับความเสี่ยง</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {criteriaItems(meta?.thresholds).map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="text-xs font-semibold text-slate-500">{item.label}</div>
                <div className="mt-1 font-bold text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

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
              clearableSort={false}
              columnWidths={["w-[21%]", "w-[14%]", "w-[8%]", "w-[8%]", "w-[14%]", "w-[9%]", "w-[10%]", "w-[16%]"]}
              headings={[
                { label: "นักเรียน", sortKey: "name" },
                { label: "โรงเรียน", sortKey: "school" },
                { label: "ชั้น", sortKey: "grade" },
                { label: "ห้อง", sortKey: "room" },
                { label: "การมาเรียน", sortKey: "attendance" },
                { label: "เคสเปิด", sortKey: "openCases" },
                { label: "ระดับ", sortKey: "risk" },
                "ดำเนินการ",
              ]}
              minWidthClassName="min-w-full"
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
                        ขาดติดกัน {row.consecutiveAbsentDays}/
                        {meta?.thresholds.lowConsecutiveAbsentDays ?? "-"} · ขาด{" "}
                        {formatNumber(row.absentDays)} · สาย {formatNumber(row.lateCount)}
                        {row.subjectLateCount > 0
                          ? ` · สายรายวิชา ${formatNumber(row.subjectLateCount)}`
                          : ""}
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-center font-bold text-slate-700">
                    {formatNumber(row.openCaseCount)}
                  </DataTableCell>
                  <DataTableCell>
                    <RiskBadge tier={row.riskTier} />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <DashboardRowAction row={row} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>

            <div className="md:hidden">
              <FilterSelect
                ariaLabel="เรียงลำดับรายงานนักเรียน"
                onChange={handleMobileSortChange}
                value={sortToValue(sort)}
              >
                {RISK_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </div>

            <TableCardList>
              {rows.map((row) => (
                <TableCard
                  key={row.studentId}
                  className="flex flex-col gap-3 transition-colors hover:border-slate-300"
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
                    <div>
                      <div className="text-xs font-semibold text-slate-500">สายรายวิชา</div>
                      <div className="font-bold text-slate-800">
                        {formatNumber(row.subjectLateCount)}/
                        {meta?.thresholds.subjectLateWatchCount ?? "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <DashboardRowAction row={row} />
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
