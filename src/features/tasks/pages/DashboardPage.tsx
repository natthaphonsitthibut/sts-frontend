import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  ContactRound,
  Eye,
  ListChecks,
  NotebookPen,
  MapPin,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  Combobox,
  HoverTooltip,
  Select,
  Tabs,
} from "../../../components/base";
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
import {
  readOptionalPositiveIntegerSearchParam,
  readPositiveIntegerSearchParam,
} from "../../../hooks/useSyncedSearchParams";
import { useRememberedState } from "../../../hooks/useRememberedState";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { getConcernLevelPresentation } from "../../teacher-comments/lib/comment-presentation";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { ReferralRegisterPanel } from "../components/ReferralRegisterPanel";
import { riskDashboardService } from "../api/risk-dashboard.service";
import type {
  ConcernLevelCode,
  RiskDashboardQuery,
  RiskDashboardRow,
  RiskDashboardSortBy,
} from "../types/risk-dashboard.types";
import { formatThaiDateTime } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import {
  formatSchoolArea,
  SCOPE_ALL_LABEL,
} from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";
import { useScopeSummary } from "../../attendance/hooks/useScopeSummary";

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
  referrals: "/student-risk-report/referrals",
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

const CONCERN_LEVELS: readonly ConcernLevelCode[] = [
  "NOTE",
  "WATCH",
  "CONCERN",
];
const CONCERN_LEVEL_TONE = {
  NOTE: "default",
  WATCH: "warning",
  CONCERN: "danger",
} as const;
const CONCERN_LEVEL_ICON = {
  NOTE: NotebookPen,
  WATCH: Eye,
  CONCERN: TriangleAlert,
} as const;

function parseConcernLevel(value: string | null): ConcernLevelCode | undefined {
  return CONCERN_LEVELS.find((level) => level === value);
}

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

function StudentCell({
  canViewStudent,
  row,
  showSchoolName,
}: {
  canViewStudent: boolean;
  row: RiskDashboardRow;
  showSchoolName: boolean;
}) {
  const avatar = (
    <StudentAvatar
      className="transition-shadow group-hover:ring-2 group-hover:ring-primary/30"
      name={row.studentName}
      photoUrl={row.studentPhotoUrl}
    />
  );
  return (
    <div className="flex min-w-0 items-center gap-3">
      {canViewStudent ? (
        <ContextLink
          aria-label={`ดูโปรไฟล์ ${row.studentName}`}
          className="group shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          to={`/students/${row.studentId}`}
        >
          {avatar}
        </ContextLink>
      ) : (
        <span className="shrink-0">{avatar}</span>
      )}
      <div className="min-w-0">
        <div className="truncate text-slate-800">{row.studentName}</div>
        {showSchoolName && row.schoolName ? (
          <div className="truncate text-xs text-slate-500">
            {row.schoolName}
          </div>
        ) : null}
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

function WatchlistRowAction({
  canViewStudent,
  row,
}: {
  canViewStudent: boolean;
  row: RiskDashboardRow;
}) {
  if (!canViewStudent) return null;
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

function StudentRiskDashboardPage() {
  const { can } = usePermissions();
  const canViewStudent = can("students");
  const [studentGroup, setStudentGroup] = useRouteTab(
    STUDENT_GROUP_ROUTES,
    "risk",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const isWatchlist = studentGroup === "watchlist";
  // The third tab answers "how is the work going", not "which students" — it
  // owns the referral register and none of the student table's controls.
  const isReferrals = studentGroup === "referrals";
  // Free text may contain a student's name or identifier, so it intentionally
  // stays in memory instead of being written to the URL with categorical filters.
  const [search, setSearch] = useRememberedState(
    "student-risk-report:search",
    "",
  );
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    parseRiskSort(searchParams.get("sort")),
  );
  const [concernLevel, setConcernLevel] = useState<
    ConcernLevelCode | undefined
  >(() => parseConcernLevel(searchParams.get("concernLevel")));
  const [academicYearInput, setAcademicYearInput] = useState<
    number | undefined
  >(() => readOptionalPositiveIntegerSearchParam(searchParams, "academicYear"));
  const [semesterInput, setSemesterInput] = useState<number | undefined>(() =>
    readOptionalPositiveIntegerSearchParam(searchParams, "semester"),
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
      concernLevel: isWatchlist ? concernLevel : undefined,
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
      concernLevel,
      scope.grade,
      scope.room,
      debouncedSearch,
      page,
      rowsPerPage,
      sortBy,
      sort?.direction,
    ],
  );
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
    setValue("concernLevel", isWatchlist ? concernLevel : undefined);
    // Legacy versions persisted free-text search in the URL. Remove it without
    // reading it back so names or identifiers do not remain in browser history.
    setValue("search", undefined);
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
    concernLevel,
    isWatchlist,
    page,
    rowsPerPage,
    scope.grade,
    scope.gradeLocked,
    scope.room,
    scope.roomLocked,
    scope.schoolId,
    scope.schoolLocked,
    searchParams,
    semester,
    setSearchParams,
    sort,
  ]);

  const riskQuery = useQuery({
    queryKey: ["risk-dashboard", query],
    queryFn: () => riskDashboardService.getRiskDashboard(query),
    placeholderData: keepPreviousData,
  });

  const rows = riskQuery.data?.items ?? [];
  const meta = riskQuery.data?.meta;
  const caseStatusMeta = meta;
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

  // Labels come from the rows themselves, which carry the catalog's own
  // `label_th`, so a level renamed in the catalog renames here too. The
  // fallback only covers the case where no student on the page has that level.
  const concernLevelLabels = new Map(
    rows
      .filter((row) => row.concernLevelCode)
      .map((row) => [
        row.concernLevelCode as ConcernLevelCode,
        row.concernLevelLabel ??
          getConcernLevelPresentation(row.concernLevelCode as ConcernLevelCode)
            .label,
      ]),
  );
  const concernLabel = (level: ConcernLevelCode): string =>
    concernLevelLabels.get(level) ?? getConcernLevelPresentation(level).label;
  const concernItems = CONCERN_LEVELS.map((level) => ({
    label: concernLabel(level),
    value: caseCount(meta?.concernLevelSummary?.[level] ?? 0),
    tone: CONCERN_LEVEL_TONE[level],
    icon: CONCERN_LEVEL_ICON[level],
    hideComparison: true,
    labelClassName: "text-base text-content-secondary",
    emphasis: true,
    onSelect: () => handleConcernLevelSelect(level),
    selected: concernLevel === level,
    selectionLabel: `กรอง${concernLabel(level)}`,
  }));

  const scopeSummary = useScopeSummary(schoolArea, scope);
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

  function handleConcernLevelChange(value: string): void {
    setConcernLevel(parseConcernLevel(value));
    resetPage();
  }

  function handleConcernLevelSelect(level: ConcernLevelCode): void {
    setConcernLevel((current) => (current === level ? undefined : level));
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
    // Checked against the route map rather than an inline list: a tab added
    // there but forgotten here used to fall through to "risk", so the new tab
    // bounced straight back to the first one.
    const nextGroup =
      value in STUDENT_GROUP_ROUTES
        ? (value as keyof typeof STUDENT_GROUP_ROUTES)
        : "risk";
    setStudentGroup(nextGroup);
    resetPage();
  }

  function handleClearScope(): void {
    scope.reset();
    schoolArea.reset();
    setAcademicYearInput(undefined);
    setSemesterInput(undefined);
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
        scope={
          <ScopeFilterField
            editable={
              !scope.schoolLocked || !scope.gradeLocked || !scope.roomLocked
            }
            onClear={handleClearScope}
            scope={{
              ...scopeSummary,
              academicYear,
              semester,
            }}
          >
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
                    { value: "", label: SCOPE_ALL_LABEL.school },
                    ...schoolArea.filteredSchools.map((school) => ({
                      value: String(school.id),
                      label: school.name,
                      description: formatSchoolArea(school),
                    })),
                  ]}
                  placeholder={SCOPE_ALL_LABEL.school}
                  value={scope.schoolId}
                />
              </label>
            ) : null}
            {/* A level the actor's scope fixes is not offered at all, the same
                as the school above it — the summary on the button already says
                what it is. */}
            {scope.gradeLocked ? null : (
              <label className="space-y-1 text-sm text-slate-800">
                ระดับชั้น
                <Select
                  aria-label="ระดับชั้น"
                  disabled={!scope.schoolId}
                  onChange={(event) => handleGradeChange(event.target.value)}
                  value={scope.grade}
                >
                  <option value="">{SCOPE_ALL_LABEL.grade}</option>
                  {scope.gradeLevels.map((grade) => (
                    <option key={grade.id} value={grade.label}>
                      {grade.label}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {scope.roomLocked ? null : (
              <label className="space-y-1 text-sm text-slate-800">
                ห้อง
                <Select
                  aria-label="ห้อง"
                  disabled={!scope.grade}
                  onChange={(event) => handleRoomChange(event.target.value)}
                  value={scope.room}
                >
                  <option value="">{SCOPE_ALL_LABEL.room}</option>
                  {scope.rooms.map((room) => (
                    <option key={room} value={room}>
                      {formatRoomLabel(room)}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label className="space-y-1 text-sm text-slate-800">
              ปีการศึกษา
              <Select
                aria-label="ปีการศึกษา"
                disabled={!scope.schoolId}
                onChange={(event) =>
                  handleAcademicYearChange(event.target.value)
                }
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
              </Select>
            </label>
            <label className="space-y-1 text-sm text-slate-800">
              ภาคเรียน
              <Select
                aria-label="ภาคเรียน"
                disabled={!academicYear}
                onChange={(event) => handleSemesterChange(event.target.value)}
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
              </Select>
            </label>
          </ScopeFilterField>
        }
        title="รายงานสถานะนักเรียน"
      />

      <div className="space-y-5">
        <div className="space-y-4">
          <Tabs
            aria-label="มุมมองรายงาน"
            className="w-full"
            onChange={handleStudentGroupChange}
            options={[
              { value: "risk", label: "กลุ่มเสี่ยง" },
              { value: "watchlist", label: "กลุ่มเฝ้าระวัง" },
              { value: "referrals", label: "งานส่งต่อ" },
            ]}
            value={studentGroup}
          />
          {/* Each tab carries its own summary cards, because each set filters
              that tab's list and nothing else. Above the tabs they read as
              page-wide totals and clicking one had to switch tab first. */}
          {isReferrals ? null : (
            <SummaryMetrics
              columns={isWatchlist ? 3 : 4}
              items={isWatchlist ? concernItems : summaryItems}
            />
          )}
          {isReferrals ? null : (
            <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row">
              <SearchInput
                className="w-full sm:max-w-[430px]"
                onChange={handleSearchChange}
                placeholder="ค้นหา"
                value={search}
              />
              {/* Both tabs carry the same pair — cards to see the split at a
                  glance, a select to pick one without hunting for the card.
                  Level labels come from the same resolver the cards use. */}
              {isWatchlist ? (
                <FilterSelect
                  ariaLabel="ระดับความกังวล"
                  className="w-full sm:w-[306px]"
                  onChange={handleConcernLevelChange}
                  value={concernLevel ?? ""}
                >
                  <option value="">ทุกระดับความกังวล</option>
                  {CONCERN_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {concernLabel(level)}
                    </option>
                  ))}
                </FilterSelect>
              ) : (
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
              )}
            </div>
          )}
        </div>

        {isReferrals ? <ReferralRegisterPanel /> : null}

        {!isReferrals && activeFilterLabels.length > 0 ? (
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

        {isReferrals ? null : riskQuery.isError ? (
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
                      "w-[6%]",
                      "w-[20%]",
                      "w-[9%]",
                      "w-[8%]",
                      "w-[13%]",
                      "w-[28%]",
                      "w-[8%]",
                      "w-[8%]",
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
                      // Not "ล่าสุด": the query picks the most severe comment
                      // and only uses recency to break a tie, so the column
                      // says what it actually shows.
                      {
                        label: "ระดับความกังวล",
                        className: "text-center",
                      },
                      { label: "ข้อสังเกต", sortKey: "problemCategory" },
                      { label: "จำนวนข้อสังเกต", className: "text-center" },
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
                isWatchlist ? "min-w-[1120px]" : "min-w-[1120px]"
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
                  <DataTableCell>
                    <StudentCell
                      canViewStudent={canViewStudent}
                      row={row}
                      showSchoolName={!scope.schoolId}
                    />
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {row.room || "-"}
                  </DataTableCell>
                  {isWatchlist ? (
                    // Badge in its own column, detail in the next — the same
                    // split the risk tab uses for สถานะการติดตาม/หมายเหตุ, so a
                    // reader scans one column of severity instead of hunting
                    // for the badge inside a paragraph.
                    <DataTableCell className="text-center">
                      {row.concernLevelCode ? (
                        <Badge
                          variant={
                            getConcernLevelPresentation(row.concernLevelCode)
                              .variant
                          }
                        >
                          {row.concernLevelLabel ??
                            getConcernLevelPresentation(row.concernLevelCode)
                              .label}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </DataTableCell>
                  ) : null}
                  <DataTableCell className="text-slate-600">
                    {isWatchlist ? (
                      <>
                        <p className="text-slate-800">
                          {row.problemCategoryLabel || "-"}
                        </p>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">
                          {row.teacherComment || "-"}
                        </p>
                      </>
                    ) : (
                      <p className="line-clamp-2 whitespace-pre-wrap">
                        {row.teacherComment || "-"}
                      </p>
                    )}
                  </DataTableCell>
                  {isWatchlist ? (
                    // How often this student has been written about. One row
                    // per student keeps the count of rows equal to the count of
                    // children; this column is what a single row would
                    // otherwise hide.
                    <DataTableCell className="text-center tabular-nums text-slate-700">
                      {row.commentCount || "-"}
                    </DataTableCell>
                  ) : null}
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
                    <div>
                      {isWatchlist ? (
                        <WatchlistRowAction
                          canViewStudent={canViewStudent}
                          row={row}
                        />
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
                      <StudentCell
                        canViewStudent={canViewStudent}
                        row={row}
                        showSchoolName={!scope.schoolId}
                      />
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        {isWatchlist ? "ข้อสังเกต" : "หมายเหตุจากครู"}
                      </div>
                      {isWatchlist && row.commentCount ? (
                        <div className="text-xs text-slate-500">
                          จำนวนข้อสังเกต{" "}
                          <span className="font-semibold tabular-nums text-slate-700">
                            {row.commentCount}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {isWatchlist && row.concernLevelCode ? (
                      <div className="mt-1 space-y-1.5">
                        <Badge
                          variant={
                            getConcernLevelPresentation(row.concernLevelCode)
                              .variant
                          }
                        >
                          {row.concernLevelLabel ??
                            getConcernLevelPresentation(row.concernLevelCode)
                              .label}
                        </Badge>
                        <p className="text-slate-800">
                          {row.problemCategoryLabel || "-"}
                        </p>
                        <p className="whitespace-pre-wrap text-xs text-slate-500">
                          {row.teacherComment || "-"}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {row.teacherComment || "-"}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex justify-end"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isWatchlist ? (
                      <WatchlistRowAction
                        canViewStudent={canViewStudent}
                        row={row}
                      />
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

export function DashboardPage() {
  const roles = useAuthSessionStore((state) => state.user?.roles ?? []);
  const aggregateOnly =
    roles.includes("EXECUTIVE") &&
    !roles.some((role) => role === "ADMIN" || role === "DIRECTOR");

  if (!aggregateOnly) return <StudentRiskDashboardPage />;

  return (
    <PageShell>
      <PageToolbar
        breadcrumbTrail={[{ label: "หน้าหลัก", to: "/" }]}
        icon={ClipboardList}
        title="รายงานสถานะนักเรียน"
      />
      <ReferralRegisterPanel aggregateOnly />
    </PageShell>
  );
}
