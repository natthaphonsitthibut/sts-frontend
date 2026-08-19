import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  ContactRound,
  Eye,
  ListChecks,
  MapPin,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Button, Combobox, HoverTooltip, Tabs } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkShareButton } from "../../../components/layout/link-share-dialog";
import { ContextLink } from "../../../components/layout/context-link";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  PageToolbar,
  PageShell,
  SearchInput,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { riskDashboardService } from "../api/risk-dashboard.service";
import type {
  RiskDashboardQuery,
  RiskDashboardRow,
  RiskDashboardSortBy,
} from "../types/risk-dashboard.types";
import { formatThaiDateTime } from "../../../lib/date-time";

const SORT_KEY_MAP: Partial<Record<string, RiskDashboardSortBy>> = {
  risk: "risk",
  name: "name",
  school: "school",
  grade: "grade",
  room: "room",
  attendance: "attendance",
  openCases: "openCases",
  updatedAt: "updatedAt",
  problemCategory: "problemCategory",
};

type RiskSortOptionValue =
  | "default"
  | `${RiskDashboardSortBy}:asc`
  | `${RiskDashboardSortBy}:desc`;
const DEFAULT_RISK_SORT: DataTableSortState = {
  key: "updatedAt",
  direction: "desc",
};
const CASE_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "STUDENT_NOT_FOUND",
  "RESOLVED",
] as const;
const STUDENT_GROUP_ROUTES = {
  risk: "/student-risk-report/risk",
  watchlist: "/student-risk-report/watchlist",
} as const;

const RISK_SORT_OPTIONS: Array<{
  value: RiskSortOptionValue;
  label: string;
  sort?: DataTableSortState;
}> = [
  { value: "default", label: "ค่าเริ่มต้น: อัปเดตล่าสุด ใหม่ → เก่า" },
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
  {
    value: "updatedAt:desc",
    label: "อัปเดตล่าสุด ใหม่ → เก่า",
    sort: { key: "updatedAt", direction: "desc" },
  },
  {
    value: "updatedAt:asc",
    label: "อัปเดตล่าสุด เก่า → ใหม่",
    sort: { key: "updatedAt", direction: "asc" },
  },
];

function parseRiskSort(value: string | null): DataTableSortState {
  if (!value || value === "default") return DEFAULT_RISK_SORT;
  return (
    RISK_SORT_OPTIONS.find((option) => option.value === value)?.sort ??
    DEFAULT_RISK_SORT
  );
}

function parseCaseStatus(
  value: string | null,
): RiskDashboardQuery["caseStatus"] | undefined {
  return CASE_STATUS_VALUES.includes(
    value as (typeof CASE_STATUS_VALUES)[number],
  )
    ? (value as NonNullable<RiskDashboardQuery["caseStatus"]>)
    : undefined;
}

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
        <div className="truncate text-slate-800">{row.studentName}</div>
      </div>
    </div>
  );
}

function needsLinkRenewal(row: RiskDashboardRow): boolean {
  return (
    (row.latestCaseStatus === "IN_PROGRESS" ||
      row.latestCaseStatus === "OPEN") &&
    !row.latestCaseMagicLink &&
    row.latestCaseHadAssignment
  );
}

function LinkExpiredIndicator() {
  return (
    <HoverTooltip label="ลิงก์หมดอายุแล้ว ต้องมอบหมายใหม่">
      <TriangleAlert
        className="size-4 shrink-0 text-danger"
        aria-hidden="true"
      />
    </HoverTooltip>
  );
}

function DashboardRowAction({ row }: { row: RiskDashboardRow }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <DetailLinkButton
        aria-label={`ดูรายละเอียดเคสของ ${row.studentName}`}
        className="bg-primary text-white hover:bg-primary-dark"
        icon={ClipboardList}
        iconOnly
        title="ดูรายละเอียดเคส"
        to={`/cases/${row.latestCaseId}`}
      />
      <LinkShareButton
        compact
        disabled={!row.latestCaseMagicLink}
        link={row.latestCaseMagicLink ?? ""}
      />
    </div>
  );
}

function WatchlistRowAction({ row }: { row: RiskDashboardRow }) {
  return (
    <DetailLinkButton
      aria-label={`ดูข้อมูลนักเรียน ${row.studentName}`}
      className="bg-primary text-white hover:bg-primary-dark"
      icon={Eye}
      iconOnly
      title="ดูข้อมูลนักเรียน"
      to={`/students/${row.studentId}`}
    />
  );
}

export function DashboardPage() {
  const [studentGroup, setStudentGroup] = useRouteTab(
    STUDENT_GROUP_ROUTES,
    "risk",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const isWatchlist = studentGroup === "watchlist";
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    () => Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE,
  );
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    parseRiskSort(searchParams.get("sort")),
  );
  const [academicYearInput, setAcademicYearInput] = useState<
    number | undefined
  >(() => Number(searchParams.get("academicYear")) || undefined);
  const [semesterInput, setSemesterInput] = useState<number | undefined>(
    () => Number(searchParams.get("semester")) || undefined,
  );
  const [caseStatus, setCaseStatus] = useState<
    RiskDashboardQuery["caseStatus"]
  >(() => parseCaseStatus(searchParams.get("caseStatus")));
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
  const termsQuery = useQuery({
    queryKey: ["student-risk-report", "terms", scope.schoolId],
    queryFn: () => attendanceService.getTerms(scope.schoolId),
    enabled: Boolean(scope.schoolId),
  });
  const schoolTerms = termsQuery.data ?? [];
  const defaultTerm =
    schoolTerms.find((term) => term.status === "ACTIVE") ?? schoolTerms[0];
  const academicYear = academicYearInput ?? defaultTerm?.academicYear;
  const semester =
    semesterInput ??
    (defaultTerm && defaultTerm.academicYear === academicYear
      ? defaultTerm.semester
      : schoolTerms.find((term) => term.academicYear === academicYear)
          ?.semester);
  const academicYears = Array.from(
    new Set(schoolTerms.map((term) => term.academicYear)),
  ).sort((left, right) => right - left);
  const semesters = schoolTerms
    .filter((term) => term.academicYear === academicYear)
    .map((term) => term.semester)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left - right);

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const sortBy = sort ? SORT_KEY_MAP[sort.key] : undefined;
  const query = useMemo<RiskDashboardQuery>(
    () => ({
      studentGroup: isWatchlist ? "WATCHLIST" : "RISK",
      schoolId: scope.schoolId || undefined,
      academicYear,
      semester,
      caseStatus: isWatchlist ? undefined : caseStatus,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
      sortBy,
      sortDirection: sort?.direction,
    }),
    [
      isWatchlist,
      scope.schoolId,
      academicYear,
      semester,
      caseStatus,
      scope.grade,
      scope.room,
      debouncedSearch,
      page,
      rowsPerPage,
      sortBy,
      sort?.direction,
    ],
  );
  const requiresSchoolSelection = !scope.schoolLocked && !scope.schoolId;

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const setValue = (key: string, value: string | undefined): void => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    setValue(
      "schoolId",
      scope.schoolLocked ? undefined : scope.schoolId || undefined,
    );
    setValue("grade", scope.gradeLocked ? undefined : scope.grade || undefined);
    setValue("room", scope.roomLocked ? undefined : scope.room || undefined);
    setValue("academicYear", academicYear ? String(academicYear) : undefined);
    setValue("semester", semester ? String(semester) : undefined);
    setValue("caseStatus", isWatchlist ? undefined : caseStatus);
    setValue("search", search.trim() || undefined);
    setValue(
      "sort",
      sortToValue(sort) === "default" ? undefined : sortToValue(sort),
    );
    setValue("page", page > 1 ? String(page) : undefined);
    setValue(
      "limit",
      rowsPerPage !== DEFAULT_PAGE_SIZE ? String(rowsPerPage) : undefined,
    );
    if (next.toString() !== searchParams.toString())
      setSearchParams(next, { replace: true });
  }, [
    academicYear,
    caseStatus,
    isWatchlist,
    page,
    rowsPerPage,
    scope.grade,
    scope.gradeLocked,
    scope.room,
    scope.roomLocked,
    scope.schoolId,
    scope.schoolLocked,
    search,
    searchParams,
    semester,
    setSearchParams,
    sort,
  ]);

  const riskQuery = useQuery({
    queryKey: ["risk-dashboard", query],
    queryFn: () => riskDashboardService.getRiskDashboard(query),
    enabled: !requiresSchoolSelection,
    placeholderData: keepPreviousData,
  });

  // The watchlist tab keeps showing the risk group's case counts, so it asks for
  // the same summary with the smallest allowed page size — the API rejects any
  // limit outside `PAGE_SIZE_OPTIONS`, which would leave every card on 0.
  const riskStatusSummaryQuery = useQuery({
    queryKey: ["risk-dashboard", "case-status-summary", query],
    queryFn: () =>
      riskDashboardService.getRiskDashboard({
        ...query,
        studentGroup: "RISK",
        caseStatus: undefined,
        page: 1,
        limit: PAGE_SIZE_OPTIONS[0],
      }),
    enabled: isWatchlist && !requiresSchoolSelection,
    placeholderData: keepPreviousData,
  });

  const rows = riskQuery.data?.items ?? [];
  const meta = riskQuery.data?.meta;
  const caseStatusMeta = isWatchlist ? riskStatusSummaryQuery.data?.meta : meta;
  const totalCount = meta?.totalCount ?? 0;
  const caseCount = (value: number) => (
    <>
      {value}
      <span className="ml-1 text-xl font-normal">เคส</span>
    </>
  );

  const summaryItems = [
    {
      label: "ไม่พบนักเรียน",
      value: caseCount(
        caseStatusMeta?.caseStatusSummary.STUDENT_NOT_FOUND ?? 0,
      ),
      tone: "danger" as const,
      icon: MapPin,
      hideComparison: true,
      labelClassName: "text-base text-content-secondary",
      emphasis: true,
      onSelect: () => handleSummaryStatusSelect("STUDENT_NOT_FOUND"),
      selected: caseStatus === "STUDENT_NOT_FOUND",
      selectionLabel: "กรองสถานะไม่พบนักเรียน",
    },
    {
      label: "รอมอบหมาย",
      value: caseCount(caseStatusMeta?.caseStatusSummary.OPEN ?? 0),
      tone: "orange" as const,
      icon: ContactRound,
      hideComparison: true,
      labelClassName: "text-base text-content-secondary",
      emphasis: true,
      onSelect: () => handleSummaryStatusSelect("OPEN"),
      selected: caseStatus === "OPEN",
      selectionLabel: "กรองสถานะรอมอบหมาย",
    },
    {
      label: "รอติดตาม",
      value: caseCount(caseStatusMeta?.caseStatusSummary.IN_PROGRESS ?? 0),
      tone: "purple" as const,
      icon: CalendarClock,
      hideComparison: true,
      labelClassName: "text-base text-content-secondary",
      emphasis: true,
      onSelect: () => handleSummaryStatusSelect("IN_PROGRESS"),
      selected: caseStatus === "IN_PROGRESS",
      selectionLabel: "กรองสถานะรอติดตาม",
    },
    {
      label: "รอพิจารณา",
      value: caseCount(caseStatusMeta?.caseStatusSummary.PENDING_REVIEW ?? 0),
      tone: "info" as const,
      icon: ListChecks,
      hideComparison: true,
      labelClassName: "text-base text-content-secondary",
      emphasis: true,
      onSelect: () => handleSummaryStatusSelect("PENDING_REVIEW"),
      selected: caseStatus === "PENDING_REVIEW",
      selectionLabel: "กรองสถานะรอพิจารณา",
    },
  ];

  const activeFilterLabels = [
    search.trim() ? `ค้นหา: ${search.trim()}` : "",
    !scope.schoolLocked && scope.schoolId ? "โรงเรียน" : "",
    academicYear ? `ปีการศึกษา ${academicYear}` : "",
    semester ? `ภาคเรียนที่ ${semester}` : "",
    caseStatus ? "สถานะการติดตาม" : "",
    !scope.gradeLocked && scope.grade ? `ชั้น ${scope.grade}` : "",
    !scope.roomLocked && scope.room ? `ห้อง ${scope.room}` : "",
    sortToValue(sort) !== "default" ? "กำหนดการเรียงเอง" : "",
  ].filter(Boolean);

  function resetPage(): void {
    setPage(1);
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
    resetPage();
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setAcademicYearInput(undefined);
    setSemesterInput(undefined);
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

  function handleAcademicYearChange(value: string): void {
    setAcademicYearInput(value ? Number(value) : undefined);
    setSemesterInput(undefined);
    resetPage();
  }

  function handleSemesterChange(value: string): void {
    setSemesterInput(value ? Number(value) : undefined);
    resetPage();
  }

  function handleCaseStatusChange(value: string): void {
    setCaseStatus(
      value
        ? (value as NonNullable<RiskDashboardQuery["caseStatus"]>)
        : undefined,
    );
    resetPage();
  }

  function handleSummaryStatusSelect(
    status: NonNullable<RiskDashboardQuery["caseStatus"]>,
  ): void {
    if (isWatchlist) {
      setStudentGroup("risk");
    }
    setCaseStatus((currentStatus) =>
      currentStatus === status ? undefined : status,
    );
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

  function handleStudentGroupChange(value: string): void {
    const nextGroup = value === "watchlist" ? "watchlist" : "risk";
    setStudentGroup(nextGroup);
    resetPage();
  }

  function handleClearFilters(): void {
    setSearch("");
    setSort(DEFAULT_RISK_SORT);
    scope.reset();
    setAcademicYearInput(undefined);
    setSemesterInput(undefined);
    setCaseStatus(undefined);
    resetPage();
  }

  return (
    <PageShell>
      <PageToolbar
        breadcrumbTrail={[{ label: "หน้าหลัก", to: "/" }]}
        icon={ClipboardList}
        title="รายงานสถานะนักเรียน"
      >
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {!scope.schoolLocked ? (
            <label className="space-y-1 text-sm text-slate-800">
              โรงเรียน
              <Combobox
                ariaLabel="ค้นหาโรงเรียน"
                emptyText={
                  schoolArea.schoolsEnabled
                    ? "ไม่พบโรงเรียน"
                    : "พิมพ์ชื่อโรงเรียนเพื่อค้นหา"
                }
                onChange={handleSchoolChange}
                onSearchChange={schoolArea.setSchoolSearch}
                options={[
                  { value: "", label: "เลือกโรงเรียน" },
                  ...schoolArea.filteredSchools.map((school) => ({
                    value: String(school.id),
                    label: school.name,
                  })),
                ]}
                placeholder="ค้นหาโรงเรียน"
                value={scope.schoolId}
              />
            </label>
          ) : null}
          <label className="space-y-1 text-sm text-slate-800">
            ปีการศึกษา
            <FilterSelect
              ariaLabel="ปีการศึกษา"
              className="w-full !w-full"
              disabled={!scope.schoolId}
              onChange={handleAcademicYearChange}
              value={academicYear ? String(academicYear) : ""}
            >
              {academicYears.length === 0 ? (
                <option value="">ปีการศึกษา</option>
              ) : null}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </FilterSelect>
          </label>
          <label className="space-y-1 text-sm text-slate-800">
            ภาคเรียน
            <FilterSelect
              ariaLabel="ภาคเรียน"
              className="w-full !w-full"
              disabled={!academicYear}
              onChange={handleSemesterChange}
              value={semester ? String(semester) : ""}
            >
              {semesters.length === 0 ? (
                <option value="">ภาคเรียน</option>
              ) : null}
              {semesters.map((item) => (
                <option key={item} value={item}>
                  ภาคเรียนที่ {item}
                </option>
              ))}
            </FilterSelect>
          </label>
          <label className="space-y-1 text-sm text-slate-800">
            ระดับชั้น
            <FilterSelect
              ariaLabel="ระดับชั้น"
              className="w-full !w-full"
              disabled={!scope.schoolId || scope.gradeLocked}
              onChange={handleGradeChange}
              value={scope.grade}
            >
              <option value="">ทั้งหมด</option>
              {scope.gradeLevels.map((grade) => (
                <option key={grade.id} value={grade.label}>
                  {grade.label}
                </option>
              ))}
            </FilterSelect>
          </label>
          <label className="space-y-1 text-sm text-slate-800">
            ห้อง
            <FilterSelect
              ariaLabel="ห้อง"
              className="w-full !w-full"
              disabled={!scope.grade || scope.roomLocked}
              onChange={handleRoomChange}
              value={scope.room}
            >
              <option value="">ทั้งหมด</option>
              {scope.rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </FilterSelect>
          </label>
        </div>
      </PageToolbar>

      <div className="space-y-5">
        <div className="space-y-4">
          <SummaryMetrics columns={4} items={summaryItems} />
          <Tabs
            aria-label="กลุ่มนักเรียน"
            className="w-full"
            onChange={handleStudentGroupChange}
            options={[
              { value: "risk", label: "กลุ่มเสี่ยง" },
              { value: "watchlist", label: "กลุ่มเฝ้าระวัง" },
            ]}
            value={studentGroup}
          />
          <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row">
            <SearchInput
              className="w-full sm:max-w-[430px]"
              onChange={handleSearchChange}
              placeholder="ค้นหา"
              value={search}
            />
            {!isWatchlist ? (
              <FilterSelect
                ariaLabel="สถานะการติดตาม"
                className="w-full sm:w-[306px]"
                onChange={handleCaseStatusChange}
                value={caseStatus ?? ""}
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="STUDENT_NOT_FOUND">ไม่พบนักเรียน</option>
                <option value="OPEN">รอมอบหมาย</option>
                <option value="IN_PROGRESS">รอติดตาม</option>
                <option value="PENDING_REVIEW">รอพิจารณา</option>
                <option value="RESOLVED">เสร็จสิ้น</option>
              </FilterSelect>
            ) : null}
          </div>
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

        {requiresSchoolSelection ? (
          <EmptyState
            icon={ClipboardList}
            title="เลือกโรงเรียน"
            description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อแสดงรายงานสถานะนักเรียน"
          />
        ) : riskQuery.isError ? (
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
              columnWidths={
                isWatchlist
                  ? [
                      "w-[7%]",
                      "w-[22%]",
                      "w-[12%]",
                      "w-[10%]",
                      "w-[35%]",
                      "w-[14%]",
                    ]
                  : [
                      "w-[6%]",
                      "w-[18%]",
                      "w-[10%]",
                      "w-[8%]",
                      "w-[23%]",
                      "w-[14%]",
                      "w-[12%]",
                      "w-[9%]",
                    ]
              }
              headings={
                isWatchlist
                  ? [
                      "ลำดับ",
                      { label: "ชื่อนักเรียน", sortKey: "name" },
                      { label: "ชั้น", sortKey: "grade" },
                      { label: "ห้อง", sortKey: "room" },
                      { label: "หัวข้อปัญหา", sortKey: "problemCategory" },
                      "เครื่องมือ",
                    ]
                  : [
                      "ลำดับ",
                      { label: "ชื่อนักเรียน", sortKey: "name" },
                      { label: "ชั้น", sortKey: "grade" },
                      { label: "ห้อง", sortKey: "room" },
                      "หมายเหตุ",
                      {
                        label: "สถานะการติดตาม",
                        sortKey: "openCases",
                        className: "text-center",
                      },
                      { label: "อัปเดตล่าสุด", sortKey: "updatedAt" },
                      "เครื่องมือ",
                    ]
              }
              minWidthClassName={
                isWatchlist ? "min-w-[960px]" : "min-w-[1120px]"
              }
              onSortChange={handleSortChange}
              sort={sort}
            >
              {rows.map((row, index) => (
                <DataTableRow
                  key={row.studentId}
                  data-student-navigation={row.studentId}
                >
                  <DataTableCell className="text-slate-800">
                    {(page - 1) * rowsPerPage + index + 1}
                  </DataTableCell>
                  <DataTableCell
                    className={isWatchlist ? "text-center" : undefined}
                  >
                    <StudentCell row={row} />
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.room || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    <p className="line-clamp-2 whitespace-pre-wrap">
                      {(isWatchlist
                        ? row.problemCategoryLabel
                        : row.teacherComment) || "-"}
                    </p>
                  </DataTableCell>
                  {!isWatchlist ? (
                    <>
                      <DataTableCell className="text-center">
                        {/* The warning hangs off the badge instead of the cell so
                          it stays centred on the badge, and the badge itself
                          stays centred in the column whether or not it shows. */}
                        <span className="relative inline-flex items-center">
                          {row.latestCaseStatus ? (
                            <CaseStatusBadge status={row.latestCaseStatus} />
                          ) : null}
                          {needsLinkRenewal(row) ? (
                            <span className="absolute inset-y-0 left-full ml-2 flex items-center">
                              <LinkExpiredIndicator />
                            </span>
                          ) : null}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-slate-700">
                        {row.latestCaseAt
                          ? formatThaiDateTime(row.latestCaseAt)
                          : "-"}
                      </DataTableCell>
                    </>
                  ) : null}
                  <DataTableCell>
                    <div
                      className={
                        isWatchlist ? "flex justify-center" : undefined
                      }
                    >
                      {isWatchlist ? (
                        <WatchlistRowAction row={row} />
                      ) : (
                        <DashboardRowAction row={row} />
                      )}
                    </div>
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
              {rows.map((row, index) => (
                <TableCard
                  key={row.studentId}
                  className="flex flex-col gap-3"
                  data-student-navigation={row.studentId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-sm text-slate-600">
                        {(page - 1) * rowsPerPage + index + 1}
                      </span>
                      <StudentCell row={row} />
                    </div>
                    {row.latestCaseStatus ? (
                      <span className="inline-flex items-center gap-1">
                        <CaseStatusBadge status={row.latestCaseStatus} />
                        {needsLinkRenewal(row) ? (
                          <LinkExpiredIndicator />
                        ) : null}
                      </span>
                    ) : (
                      <span
                        className="text-slate-400"
                        aria-label="ไม่มีสถานะเคส"
                      >
                        —
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">ระดับชั้น</div>
                      <div className="text-slate-800">
                        {row.grade || "-"}
                        {row.room ? `/${row.room}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">อัปเดตล่าสุด</div>
                      <div className="text-slate-800">
                        {row.latestCaseAt
                          ? formatThaiDateTime(row.latestCaseAt)
                          : "-"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {isWatchlist ? "หัวข้อปัญหา" : "หมายเหตุจากครู"}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {(isWatchlist
                        ? row.problemCategoryLabel
                        : row.teacherComment) || "-"}
                    </p>
                  </div>
                  <div
                    className="flex justify-end"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isWatchlist ? (
                      <WatchlistRowAction row={row} />
                    ) : (
                      <DashboardRowAction row={row} />
                    )}
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
