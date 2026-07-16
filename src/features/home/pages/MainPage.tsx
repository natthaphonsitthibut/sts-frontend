import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  ShieldAlert,
  Siren,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, Combobox, Select, buttonVariants } from "../../../components/base";
import { ChartLegend, EmptyChart, PairedBarChart, StackedBarTrend } from "../../../components/charts/chart-primitives";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonCards,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { getPageIdentity } from "../../../components/layout/page-identity";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useCurrentUserPresentation } from "../hooks/useCurrentUserPresentation";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import type {
  HomeDashboardCaseMovementPoint,
  HomeDashboardCasePipeline,
  HomeDashboardFilters,
  HomeDashboardMetric,
  HomeDashboardOption,
  HomeDashboardPeriod,
  HomeDashboardRiskDistribution,
  HomeDashboardTrendPoint,
} from "../types/home-dashboard.types";

const PERIOD_OPTIONS: Array<{ value: HomeDashboardPeriod; label: string }> = [
  { value: "7_DAYS", label: "7 วัน" },
  { value: "30_DAYS", label: "30 วัน" },
  { value: "CURRENT_TERM", label: "ภาคเรียนปัจจุบัน" },
];

const METRIC_ICONS: Record<string, typeof Users> = {
  totalStudents: Users,
  watchStudents: Siren,
  activeCases: Clock,
  pendingReview: ClipboardCheck,
};

const TONE_CLASSES: Record<HomeDashboardMetric["tone"], string> = {
  default: "bg-slate-50 text-slate-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-primary-soft text-primary-dark",
};

const RISK_LABELS: Record<keyof HomeDashboardRiskDistribution, string> = {
  HIGH: "สูง",
  MEDIUM: "กลาง",
  LOW: "ต่ำ",
  WATCH: "เฝ้าดู",
  NORMAL: "ปกติ",
};

const CASE_LABELS: Record<keyof HomeDashboardCasePipeline, string> = {
  OPEN: "เปิดใหม่",
  IN_PROGRESS: "กำลังติดตาม",
  REPORTED_UP: "รายงานขึ้นส่วนกลางแล้ว",
  PENDING_REVIEW: "รอตรวจผล",
  RESOLVED: "ปิดแล้ว",
};

function parseFilters(searchParams: URLSearchParams): HomeDashboardFilters {
  const period = searchParams.get("period");
  const schoolId = Number(searchParams.get("schoolId"));
  return {
    period:
      period === "7_DAYS" || period === "CURRENT_TERM" || period === "30_DAYS"
        ? period
        : "30_DAYS",
    province: searchParams.get("province") || undefined,
    district: searchParams.get("district") || undefined,
    subDistrict: searchParams.get("subDistrict") || undefined,
    schoolId: Number.isInteger(schoolId) && schoolId > 0 ? schoolId : undefined,
    grade: searchParams.get("grade") || undefined,
    room: searchParams.get("room") || undefined,
  };
}

function buildQuery(
  base: Record<string, string | number | undefined> | HomeDashboardFilters = {},
): string {
  const params = new URLSearchParams();
  Object.entries(base as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function destination(path: string, query?: Record<string, string | number>): string {
  return `${path}${buildQuery(query)}`;
}

function FilterCombobox({
  allLabel,
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
  formatOptionLabel,
}: {
  allLabel: string;
  ariaLabel: string;
  options: HomeDashboardOption[];
  value?: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  formatOptionLabel?: (option: HomeDashboardOption) => string;
}) {
  return (
    <Combobox
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={onChange}
      options={[
        { value: "", label: allLabel },
        ...options.map((option) => ({
          value: String(option.value),
          label: formatOptionLabel?.(option) ?? option.label,
        })),
      ]}
      placeholder={allLabel}
      value={value === undefined ? "" : String(value)}
    />
  );
}

function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);

  function updateFilter(next: Partial<HomeDashboardFilters>): void {
    const merged: HomeDashboardFilters = { ...filters, ...next };
    if ("province" in next) {
      merged.district = undefined;
      merged.subDistrict = undefined;
      merged.schoolId = undefined;
      merged.grade = undefined;
      merged.room = undefined;
    }
    if ("district" in next) {
      merged.subDistrict = undefined;
      merged.schoolId = undefined;
      merged.grade = undefined;
      merged.room = undefined;
    }
    if ("subDistrict" in next) {
      merged.schoolId = undefined;
      merged.grade = undefined;
      merged.room = undefined;
    }
    if ("schoolId" in next) {
      merged.grade = undefined;
      merged.room = undefined;
    }
    if ("grade" in next) {
      merged.room = undefined;
    }
    setSearchParams(buildQuery(merged).slice(1), { replace: true });
  }

  function reset(): void {
    setSearchParams("", { replace: true });
  }

  return { filters, reset, updateFilter };
}

function DashboardFilterBar({
  filters,
  options,
  onUpdate,
}: {
  filters: HomeDashboardFilters;
  options?: {
    provinces: HomeDashboardOption[];
    districts: HomeDashboardOption[];
    subDistricts: HomeDashboardOption[];
    schools: HomeDashboardOption[];
    grades: HomeDashboardOption[];
    rooms: HomeDashboardOption[];
  };
  onUpdate: (next: Partial<HomeDashboardFilters>) => void;
}) {
  const safeOptions = options ?? {
    provinces: [],
    districts: [],
    subDistricts: [],
    schools: [],
    grades: [],
    rooms: [],
  };
  return (
    <ToolbarFilterGrid>
      <Select
        aria-label="ช่วงแนวโน้ม"
        value={filters.period}
        onChange={(event) =>
          onUpdate({ period: event.currentTarget.value as HomeDashboardPeriod })
        }
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <FilterCombobox
        allLabel="ทุกจังหวัด"
        ariaLabel="จังหวัด"
        options={safeOptions.provinces}
        value={filters.province}
        onChange={(value) => onUpdate({ province: value || undefined })}
      />
      <FilterCombobox
        allLabel="ทุกอำเภอ/เขต"
        ariaLabel="อำเภอ/เขต"
        options={safeOptions.districts}
        value={filters.district}
        onChange={(value) => onUpdate({ district: value || undefined })}
        disabled={!filters.province}
      />
      <FilterCombobox
        allLabel="ทุกตำบล/แขวง"
        ariaLabel="ตำบล/แขวง"
        options={safeOptions.subDistricts}
        value={filters.subDistrict}
        onChange={(value) => onUpdate({ subDistrict: value || undefined })}
        disabled={!filters.district}
      />
      <FilterCombobox
        allLabel="ทุกโรงเรียน"
        ariaLabel="โรงเรียน"
        options={safeOptions.schools}
        value={filters.schoolId}
        onChange={(value) => onUpdate({ schoolId: value ? Number(value) : undefined })}
      />
      <FilterCombobox
        allLabel="ทุกชั้น"
        ariaLabel="ชั้น"
        options={safeOptions.grades}
        value={filters.grade}
        onChange={(value) => onUpdate({ grade: value || undefined })}
        disabled={!filters.schoolId}
      />
      <FilterCombobox
        allLabel="ทุกห้อง"
        ariaLabel="ห้อง"
        options={safeOptions.rooms}
        formatOptionLabel={(option) => formatRoomLabel(option.value)}
        value={filters.room}
        onChange={(value) => onUpdate({ room: value || undefined })}
        disabled={!filters.grade}
      />
    </ToolbarFilterGrid>
  );
}

function MetricGrid({ metrics }: { metrics: HomeDashboardMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const pageIdentity = getPageIdentity(metric.targetPath);
        const Icon = METRIC_ICONS[metric.key] ?? pageIdentity?.icon ?? BarChart3;
        return (
          <Link
            key={metric.key}
            to={destination(metric.targetPath, metric.targetQuery)}
            className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  TONE_CLASSES[metric.tone],
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">
                {metric.value.toLocaleString("th-TH")}
              </span>
            </div>
            <div className="text-sm font-medium text-slate-700">
              {metric.label}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function AttentionQueue({ items }: { items: Array<{
  id: string;
  label: string;
  reason: string;
  count: number;
  ageLabel: string | null;
  targetPath: string;
  targetQuery?: Record<string, string | number>;
}> }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ต้องดำเนินการวันนี้</h2>
          <p className="text-sm text-slate-500">เรียงตามความเร่งด่วนจากข้อมูลในขอบเขตปัจจุบัน</p>
        </div>
        <Badge variant={items.length > 0 ? "warning" : "success"}>
          {items.length > 0 ? `${items.length} รายการ` : "ไม่มีรายการเร่งด่วน"}
        </Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          ยังไม่พบงานเร่งด่วนในขอบเขตนี้
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={destination(item.targetPath, item.targetQuery)}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="size-4 text-warning-700" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{item.label}</span>
                  <Badge variant="secondary">{item.count.toLocaleString("th-TH")}</Badge>
                </span>
                <span className="mt-1 block text-sm text-slate-600">{item.reason}</span>
              </span>
              <span className="text-sm font-medium text-primary-dark">
                {item.ageLabel ? `เก่าสุด ${item.ageLabel}` : "เปิดรายการ"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function AttendanceTrendChart({ points }: { points: HomeDashboardTrendPoint[] }) {
  const hasData = points.some((point) => point.total > 0);
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900">แนวโน้มการมาเรียน</h2>
      <p className="mb-4 text-sm text-slate-500">จำนวนมา สาย และขาด รายวันตามขอบเขตที่เลือก</p>
      {!hasData ? (
        <EmptyChart />
      ) : (
        <>
          <ChartLegend items={[
            { className: "bg-success-300", label: "มา" },
            { className: "bg-warning-200", label: "สาย" },
            { className: "bg-danger-200", label: "ขาด" },
          ]} />
          <StackedBarTrend
            points={points.map((point) => ({
              key: point.key,
              label: point.label.slice(5),
              values: [point.present, point.late, point.absent],
            }))}
            segmentClasses={["bg-success-300", "bg-warning-200", "bg-danger-200"]}
          />
          <ChartTable
            headers={["วัน", "มา", "สาย", "ขาด", "อัตรามา"]}
            rows={points.slice(-7).map((point) => [
              point.label,
              point.present.toLocaleString("th-TH"),
              point.late.toLocaleString("th-TH"),
              point.absent.toLocaleString("th-TH"),
              point.attendanceRate === null ? "-" : `${point.attendanceRate}%`,
            ])}
          />
        </>
      )}
    </Card>
  );
}

function RiskDistributionChart({ summary }: { summary: HomeDashboardRiskDistribution }) {
  const entries = Object.entries(summary) as Array<[keyof HomeDashboardRiskDistribution, number]>;
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const segmentClasses: Record<keyof HomeDashboardRiskDistribution, string> = {
    HIGH: "bg-danger-600",
    MEDIUM: "bg-warning-500",
    LOW: "bg-warning-200",
    WATCH: "bg-primary",
    NORMAL: "bg-success-500",
  };
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900">การกระจายระดับความเสี่ยง</h2>
      <p className="mb-4 text-sm text-slate-500">สรุปจากการประเมินความเสี่ยงล่าสุด</p>
      {total === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="flex h-5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className={segmentClasses[key]}
                style={{ width: `${(value / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-md bg-slate-50 p-2 text-sm">
                <div className="font-semibold text-slate-900">{RISK_LABELS[key]}</div>
                <div className="tabular-nums text-slate-600">{value.toLocaleString("th-TH")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function CaseCharts({
  pipeline,
  movement,
}: {
  pipeline: HomeDashboardCasePipeline | null;
  movement: HomeDashboardCaseMovementPoint[] | null;
}) {
  if (!pipeline && !movement) return null;
  const pipelineEntries = pipeline
    ? (Object.entries(pipeline) as Array<[keyof HomeDashboardCasePipeline, number]>)
    : [];
  const maxPipeline = Math.max(1, ...pipelineEntries.map(([, value]) => value));
  const hasMovementData = movement?.some((point) => point.opened > 0 || point.resolved > 0) ?? false;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {pipeline ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">สถานะเคสช่วยเหลือ</h2>
          <div className="mt-4 space-y-3">
            {pipelineEntries.map(([key, value]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{CASE_LABELS[key]}</span>
                  <span className="tabular-nums text-slate-600">
                    {value.toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(value / maxPipeline) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {movement ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">เคสเปิดใหม่เทียบปิดแล้ว</h2>
          {!hasMovementData ? (
            <EmptyChart />
          ) : (
            <>
              <ChartLegend items={[
                { className: "bg-primary", label: "เปิดใหม่" },
                { className: "bg-success-500", label: "ปิดแล้ว" },
              ]} />
              <PairedBarChart points={movement.map((point) => ({
                key: point.key,
                label: point.label,
                primary: point.opened,
                secondary: point.resolved,
              }))} />
            </>
          )}
          <ChartTable
            headers={["สัปดาห์", "เปิดใหม่", "ปิดแล้ว"]}
            rows={(movement ?? []).map((point) => [
              point.label,
              point.opened.toLocaleString("th-TH"),
              point.resolved.toLocaleString("th-TH"),
            ])}
          />
        </Card>
      ) : null}
    </div>
  );
}

function ChartTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="sr-only">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MainPage() {
  const { displayName, roleLabel, affiliation } = useCurrentUserPresentation();
  const { can } = usePermissions();
  const { filters, reset, updateFilter } = useDashboardFilters();
  const {
    summary,
    trends,
    filterOptions,
    isLoading,
    isTrendsLoading,
    isError,
    isTrendsError,
    isFilterOptionsError,
    dataUpdatedAt,
    refetch,
    refetchTrends,
    refetchFilterOptions,
  } = useHomeDashboard(filters);
  const shortcuts = [
    can("attendance") || can("attendance-dashboard")
      ? { to: "/attendance-operations", icon: CalendarCheck, label: "งานเช็คชื่อ" }
      : null,
    can("dashboard")
      ? { to: "/student-risk-report", icon: ShieldAlert, label: "เฝ้าระวัง" }
      : null,
    can("review-cases")
      ? { to: "/cases", icon: BriefcaseBusiness, label: "เคสช่วยเหลือ" }
      : null,
  ].filter((item): item is { to: string; icon: typeof Users; label: string } => Boolean(item));

  return (
    <PageShell>
      <PageToolbar
        icon={Activity}
        title="ศูนย์สั่งการวันนี้"
        description={`${displayName} · ${roleLabel} · ${affiliation}`}
        footerActions={<>
          <RefreshButton onRefresh={refetch} updatedAt={dataUpdatedAt} />
          <ClearFiltersButton onClear={reset} />
        </>}
      >
        <DashboardFilterBar
          filters={filters}
          options={filterOptions?.options}
          onUpdate={updateFilter}
        />
      </PageToolbar>

      {isFilterOptionsError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>โหลดตัวเลือกขอบเขตไม่สำเร็จ</AlertTitle>
          <AlertDescription>ข้อมูลสรุปยังใช้งานได้ แต่ยังเปลี่ยนขอบเขตไม่ได้</AlertDescription>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetchFilterOptions()}>
            โหลดตัวเลือกใหม่
          </Button>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-5">
          <SkeletonCards count={3} />
          <SkeletonCards count={3} />
        </div>
      ) : isError || !summary ? (
        <ErrorState
          title="ไม่สามารถโหลดศูนย์สั่งการได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลหน้าหลัก"
          onRetry={refetch}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{summary.scopeLabel}</Badge>
              <Badge variant="secondary">
                {PERIOD_OPTIONS.find((option) => option.value === summary.period)?.label}
              </Badge>
            </div>
          </div>

          <AttentionQueue items={summary.attentionItems} />
          <MetricGrid metrics={summary.metrics} />

          {isTrendsLoading ? (
            <SkeletonCards count={2} />
          ) : isTrendsError || !trends ? (
            <Alert variant="destructive">
              <AlertTitle>โหลดข้อมูลแนวโน้มไม่สำเร็จ</AlertTitle>
              <AlertDescription>งานเร่งด่วนและตัวเลขสรุปด้านบนยังเป็นข้อมูลล่าสุดที่โหลดสำเร็จ</AlertDescription>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetchTrends()}>
                โหลดแนวโน้มใหม่
              </Button>
            </Alert>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                {trends.attendanceTrend ? (
                  <AttendanceTrendChart points={trends.attendanceTrend} />
                ) : null}
                {trends.riskDistribution ? (
                  <RiskDistributionChart summary={trends.riskDistribution.summary} />
                ) : null}
              </div>
              <CaseCharts pipeline={trends.casePipeline} movement={trends.caseMovement} />
            </>
          )}

          {shortcuts.length > 0 ? <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">ทางลัดทำงานต่อ</h2>
                <p className="text-sm text-slate-500">
                  ไปยังรายการหลักที่รองรับการกรองจริง ไม่มีฟอร์มส่งออกซ้ำบนหน้าหลัก
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map((shortcut) => (
                  <LinkButton key={shortcut.to} to={shortcut.to} icon={shortcut.icon}>
                    {shortcut.label}
                  </LinkButton>
                ))}
              </div>
            </div>
          </Card> : null}
        </div>
      )}
    </PageShell>
  );
}

function LinkButton({
  children,
  icon: Icon,
  to,
}: {
  children: string;
  icon: typeof Users;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={buttonVariants({ variant: "outline" })}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
