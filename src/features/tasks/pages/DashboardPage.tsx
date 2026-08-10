import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileDown,
  LayoutDashboard,
  Search,
  RotateCcw,
  Users,
} from "lucide-react";
import { Badge, Button, InfoTooltip } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { ContextLink } from "../../../components/layout/context-link";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { formatRoomLabel } from "../../../lib/room-presentation";
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
import { usePermissions } from "../../auth/hooks/usePermissions";
import { StudentCaseAction } from "../../cases/components/StudentCaseAction";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import {
  RISK_TIER_ORDER,
  RISK_TIER_PRESENTATION,
} from "../../students/lib/risk-tier-presentation";
import { RISK_TIER_LABELS } from "../../students/lib/student-presentation";
import { riskDashboardService } from "../api/risk-dashboard.service";
import type {
  RiskDashboardQuery,
  RiskDashboardRow,
  RiskDashboardSortBy,
  RiskDashboardTier,
  RiskDashboardTierFilter,
  RiskDashboardThresholds,
} from "../types/risk-dashboard.types";
import { RiskReportTabs } from "../../student-observations/components/RiskReportTabs";

const RISK_FILTER_OPTIONS: Array<{
  value: RiskDashboardTierFilter;
  label: string;
}> = [
  { value: "ALL", label: "ทุกระดับ" },
  ...RISK_TIER_ORDER.map((value) => ({
    value,
    label: RISK_TIER_LABELS[value],
  })),
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

type RiskSortOptionValue =
  | "default"
  | `${RiskDashboardSortBy}:asc`
  | `${RiskDashboardSortBy}:desc`;
const DEFAULT_RISK_SORT: DataTableSortState = {
  key: "risk",
  direction: "desc",
};

const RISK_SORT_OPTIONS: Array<{
  value: RiskSortOptionValue;
  label: string;
  sort?: DataTableSortState;
}> = [
  { value: "default", label: "ค่าเริ่มต้น: ระดับเสี่ยง มาก → น้อย" },
  {
    value: "risk:asc",
    label: "ระดับเสี่ยง น้อย → มาก",
    sort: { key: "risk", direction: "asc" },
  },
  {
    value: "name:asc",
    label: "ชื่อนักเรียน ก → ฮ",
    sort: { key: "name", direction: "asc" },
  },
  {
    value: "name:desc",
    label: "ชื่อนักเรียน ฮ → ก",
    sort: { key: "name", direction: "desc" },
  },
  {
    value: "school:asc",
    label: "โรงเรียน ก → ฮ",
    sort: { key: "school", direction: "asc" },
  },
  {
    value: "grade:asc",
    label: "ชั้น น้อย → มาก",
    sort: { key: "grade", direction: "asc" },
  },
  {
    value: "room:asc",
    label: "ห้อง น้อย → มาก",
    sort: { key: "room", direction: "asc" },
  },
  {
    value: "attendance:asc",
    label: "การมาเรียน ต่ำ → สูง",
    sort: { key: "attendance", direction: "asc" },
  },
  {
    value: "attendance:desc",
    label: "การมาเรียน สูง → ต่ำ",
    sort: { key: "attendance", direction: "desc" },
  },
  {
    value: "openCases:desc",
    label: "เคสเปิด มาก → น้อย",
    sort: { key: "openCases", direction: "desc" },
  },
  {
    value: "openCases:asc",
    label: "เคสเปิด น้อย → มาก",
    sort: { key: "openCases", direction: "asc" },
  },
];

function sortToValue(
  sort: DataTableSortState | undefined,
): RiskSortOptionValue {
  if (
    !sort ||
    (sort.key === DEFAULT_RISK_SORT.key &&
      sort.direction === DEFAULT_RISK_SORT.direction)
  ) {
    return "default";
  }
  const sortBy = SORT_KEY_MAP[sort.key] ?? "risk";
  return `${sortBy}:${sort.direction}`;
}

function formatNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toLocaleString() : "-";
}

function formatPercent(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

function criteriaItems(
  thresholds?: RiskDashboardThresholds,
): Array<{ label: string; value: string }> {
  if (!thresholds) return [{ label: "สถานะ", value: "กำลังโหลดเกณฑ์" }];
  return [
    {
      label: "เสี่ยง",
      value: `ขาดสะสม ≥${thresholds.highAbsentDays} วันในเทอม (ไม่ต้องติดกัน นับวันที่ขาดครบทุกคาบ)`,
    },
    {
      label: "เฝ้าระวัง",
      value: "มีความคิดเห็นจากคุณครูถึงนักเรียน",
    },
    {
      label: "ปกติ",
      value: "ไม่เข้าเกณฑ์เสี่ยงและไม่มีความคิดเห็นจากคุณครู",
    },
  ];
}

function RiskBadge({ tier }: { tier: RiskDashboardTier }) {
  const presentation = RISK_TIER_PRESENTATION[tier];
  return <Badge variant={presentation.badge}>{presentation.label}</Badge>;
}

function StudentCell({ row }: { row: RiskDashboardRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ContextLink
        aria-label={`ดูโปรไฟล์ ${row.studentName}`}
        className="group shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        to={`/students/${row.studentId}`}
      >
        <StudentAvatar
          className="transition-shadow group-hover:ring-2 group-hover:ring-primary/30"
          name={row.studentName}
          photoUrl={row.studentPhotoUrl}
        />
      </ContextLink>
      <div className="min-w-0">
        <div className="truncate text-slate-800">
          {row.studentName}
        </div>
      </div>
    </div>
  );
}

function getSuggestedCaseReason(row: RiskDashboardRow): string {
  const tierLabel = RISK_TIER_LABELS[row.riskTier] ?? row.riskTier;
  const signals = [
    row.consecutiveAbsentDays > 0
      ? `ขาดเรียนติดต่อกัน ${row.consecutiveAbsentDays} วัน`
      : null,
    row.absentDays > 0 ? `ขาดสะสม ${row.absentDays} วัน` : null,
    row.lateCount > 0 ? `มาสาย ${row.lateCount} ครั้ง` : null,
  ].filter(Boolean);
  return [`สัญญาณความเสี่ยง${tierLabel}`, ...signals].join(" · ");
}

function DashboardRowAction({
  canOpenCases,
  row,
}: {
  canOpenCases: boolean;
  row: RiskDashboardRow;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {canOpenCases ? (
        <StudentCaseAction
          activeCaseCount={row.openCaseCount}
          activeCaseId={row.latestOpenCaseId}
          initialReason={getSuggestedCaseReason(row)}
          studentId={row.studentId}
          studentName={row.studentName}
        />
      ) : null}
      <DetailLinkButton
        aria-label="ดูรายละเอียดนักเรียน"
        iconOnly
        title="ดูรายละเอียดนักเรียน"
        to={`/students/${row.studentId}`}
      />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const initialRiskTier = searchParams.get("riskTier");
  const [riskTier, setRiskTier] = useState<RiskDashboardTierFilter>(() =>
    RISK_FILTER_OPTIONS.some((option) => option.value === initialRiskTier)
      ? (initialRiskTier as RiskDashboardTierFilter)
      : "ALL",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>(
    DEFAULT_RISK_SORT,
  );
  const schoolArea = useSchoolAreaFilter({
    province: searchParams.get("province") || undefined,
    district: searchParams.get("district") || undefined,
    subDistrict: searchParams.get("subDistrict") || undefined,
  });
  const scope = useScopeCascade({
    lockToActorScope: true,
    initialSchoolId: searchParams.get("schoolId") || undefined,
    initialGrade: searchParams.get("grade") || undefined,
    initialRoom: searchParams.get("room") || undefined,
  });
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const sortBy = sort ? SORT_KEY_MAP[sort.key] : undefined;
  const filteredRiskExportUrl = buildDataExportContextUrl("student_risk", {
    province: schoolArea.province,
    district: schoolArea.district,
    subDistrict: schoolArea.subDistrict,
    schoolId: scope.schoolId,
    grade: scope.grade,
    room: scope.room,
    riskTier: riskTier === "ALL" ? undefined : riskTier,
  });

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

  const summaryOrder: readonly RiskDashboardTier[] = RISK_TIER_ORDER;
  const summaryTotal = summaryOrder.reduce(
    (total, tier) => total + (meta?.summary?.[tier] ?? 0),
    0,
  );
  const summaryItems = [
    {
      label: "ทั้งหมด",
      value: summaryTotal.toLocaleString(),
      tone: "default" as const,
      icon: Users,
      emphasis: true,
      onSelect: () => {
        setRiskTier("ALL");
        resetPage();
      },
      selected: riskTier === "ALL",
      selectionLabel: "แสดงนักเรียนทุกระดับ",
    },
    ...summaryOrder.map((tier) => {
      const presentation = RISK_TIER_PRESENTATION[tier];
      return {
        label: presentation.label,
        value: meta?.summary?.[tier]?.toLocaleString() ?? 0,
        tone: presentation.tone,
        icon: presentation.icon,
        onSelect: () => handleSummaryFilter(tier),
        selected: riskTier === tier,
        selectionLabel: `${riskTier === tier ? "ยกเลิกตัวกรอง" : "กรอง"}${presentation.label}`,
      };
    }),
  ];

  const activeFilterLabels = [
    search.trim() ? `ค้นหา: ${search.trim()}` : "",
    riskTier !== "ALL"
      ? (RISK_FILTER_OPTIONS.find((option) => option.value === riskTier)
          ?.label ?? "")
      : "",
    schoolArea.province,
    schoolArea.district,
    schoolArea.subDistrict,
    !scope.schoolLocked && scope.schoolId ? "โรงเรียน" : "",
    !scope.gradeLocked && scope.grade ? `ชั้น ${scope.grade}` : "",
    !scope.roomLocked && scope.room ? formatRoomLabel(scope.room) : "",
    sortToValue(sort) !== "default" ? "กำหนดการเรียงเอง" : "",
  ].filter(Boolean);

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
    const nextSort =
      value === "default"
        ? DEFAULT_RISK_SORT
        : RISK_SORT_OPTIONS.find((option) => option.value === value)?.sort;
    setSort(nextSort);
    resetPage();
  }

  function handleSummaryFilter(tier: RiskDashboardTier): void {
    setRiskTier((current) => (current === tier ? "ALL" : tier));
    resetPage();
  }

  function handleClearFilters(): void {
    setSearch("");
    setRiskTier("ALL");
    setSort(DEFAULT_RISK_SORT);
    schoolArea.setProvince("");
    scope.reset();
    resetPage();
  }

  return (
    <PageShell>
      <ListPageToolbar
        navigation={<RiskReportTabs />}
        icon={LayoutDashboard}
        title="ความเสี่ยงจากการมาเรียน"
        description="ติดตามข้อมูลการมาเรียนและเคสติดตามนักเรียนในขอบเขตข้อมูล"
        tableActions={
          <>
            <RefreshButton onRefresh={() => void riskQuery.refetch()} updatedAt={riskQuery.dataUpdatedAt} />
            {can("export-data") ? (
              <Button
                icon={FileDown}
                onClick={() => navigate(filteredRiskExportUrl)}
                variant="outline"
              >
                ส่งออกตามตัวกรองนี้
              </Button>
            ) : null}
          </>
        }
        onClearFilters={handleClearFilters}
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
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-600">
            <span>เกณฑ์การจัดระดับ</span>
            <InfoTooltip
              align="end"
              contentClassName="w-80 max-w-[calc(100vw-2rem)]"
              label="เกณฑ์การจัดระดับความเสี่ยง"
            >
              <div className="space-y-2.5">
                {criteriaItems(meta?.thresholds).map((item) => (
                  <div key={item.label}>
                    <div className="font-semibold text-slate-800">
                      {item.label}
                    </div>
                    <div className="mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </InfoTooltip>
          </div>
          {/* Four cards (ทั้งหมด + three tiers) fit one row exactly. */}
          <SummaryMetrics columns={4} items={summaryItems} />
        </div>

        {activeFilterLabels.length > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 md:hidden">
            <div className="min-w-0 text-xs font-semibold text-slate-700">
              <span className="block">
                ใช้ตัวกรอง {activeFilterLabels.length} รายการ
              </span>
              <span className="block truncate font-normal text-slate-600">
                {activeFilterLabels.join(" · ")}
              </span>
            </div>
            <Button
              icon={RotateCcw}
              onClick={handleClearFilters}
              size="sm"
              variant="ghost"
            >
              ล้างทั้งหมด
            </Button>
          </div>
        ) : null}

        {riskQuery.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดรายงานนักเรียนได้"
            description="กรุณาลองใหม่อีกครั้ง"
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
              columnWidths={[
                "w-[21%]",
                "w-[14%]",
                "w-[8%]",
                "w-[8%]",
                "w-[14%]",
                "w-[9%]",
                "w-[10%]",
                "w-[16%]",
              ]}
              headings={[
                { label: "นักเรียน", sortKey: "name" },
                { label: "โรงเรียน", sortKey: "school" },
                { label: "ชั้น", sortKey: "grade" },
                { label: "ห้อง", sortKey: "room" },
                { label: "การมาเรียน", sortKey: "attendance" },
                { label: "เคสเปิด", sortKey: "openCases" },
                { label: "ระดับ", sortKey: "risk" },
                "",
              ]}
              minWidthClassName="min-w-full"
              onSortChange={handleSortChange}
              sort={sort}
            >
              {rows.map((row) => (
                <DataTableRow
                  key={row.studentId}
                  data-student-navigation={row.studentId}
                >
                  <DataTableCell>
                    <StudentCell row={row} />
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.schoolName || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.room || "-"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="space-y-1 text-sm">
                      <div className="text-slate-800">
                        {formatPercent(row.weightedAttendancePercent)}
                      </div>
                      <div className="text-xs text-slate-500">
                        ขาดสะสม {formatNumber(row.absentDays)}/
                        {meta?.thresholds.highAbsentDays ?? "-"} วัน · สาย{" "}
                        {formatNumber(row.lateCount)}
                        {row.subjectLateCount > 0
                          ? ` · สายรายวิชา ${formatNumber(row.subjectLateCount)}`
                          : ""}
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-slate-700">
                    {formatNumber(row.openCaseCount)}
                  </DataTableCell>
                  <DataTableCell>
                    <RiskBadge tier={row.riskTier} />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <DashboardRowAction canOpenCases={can("review-cases")} row={row} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>

            <div className="space-y-1.5 md:hidden">
              <div className="text-xs font-semibold text-slate-700">
                เรียงตาม
              </div>
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
                  className="flex flex-col gap-3"
                  data-student-navigation={row.studentId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <StudentCell row={row} />
                    <RiskBadge tier={row.riskTier} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">
                        การมาเรียน
                      </div>
                      <div className="text-slate-800">
                        {formatPercent(row.weightedAttendancePercent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        เคสเปิด
                      </div>
                      <div className="text-slate-800">
                        {formatNumber(row.openCaseCount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        ขาดสะสม
                      </div>
                      <div className="text-slate-800">
                        {formatNumber(row.absentDays)}/
                        {meta?.thresholds.highAbsentDays ?? "-"} วัน
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        สาย
                      </div>
                      <div className="text-slate-800">
                        {formatNumber(row.lateCount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        สายรายวิชา
                      </div>
                      <div className="text-slate-800">
                        {formatNumber(row.subjectLateCount)}
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex justify-end"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DashboardRowAction canOpenCases={can("review-cases")} row={row} />
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
