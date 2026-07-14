import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, Select } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
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
  watchStudents: ShieldAlert,
  activeCases: BriefcaseBusiness,
  pendingReview: Clock3,
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
  AWAITING_HELP: "รอช่วยเหลือ",
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

function FilterSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: HomeDashboardOption[];
  value?: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="min-w-0 space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <Select
        value={value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
      >
        <option value="">ทั้งหมด</option>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
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
  isFetching,
  onReset,
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
  isFetching: boolean;
  onReset: () => void;
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
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-700">ช่วงแนวโน้ม</span>
        <Select
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
      </label>
      <FilterSelect
        label="จังหวัด"
        options={safeOptions.provinces}
        value={filters.province}
        onChange={(value) => onUpdate({ province: value || undefined })}
      />
      <FilterSelect
        label="อำเภอ"
        options={safeOptions.districts}
        value={filters.district}
        onChange={(value) => onUpdate({ district: value || undefined })}
        disabled={!filters.province}
      />
      <FilterSelect
        label="ตำบล"
        options={safeOptions.subDistricts}
        value={filters.subDistrict}
        onChange={(value) => onUpdate({ subDistrict: value || undefined })}
        disabled={!filters.district}
      />
      <FilterSelect
        label="โรงเรียน"
        options={safeOptions.schools}
        value={filters.schoolId}
        onChange={(value) => onUpdate({ schoolId: value ? Number(value) : undefined })}
      />
      <FilterSelect
        label="ชั้น"
        options={safeOptions.grades}
        value={filters.grade}
        onChange={(value) => onUpdate({ grade: value || undefined })}
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <FilterSelect
          label="ห้อง"
          options={safeOptions.rooms}
          value={filters.room}
          onChange={(value) => onUpdate({ room: value || undefined })}
          disabled={!filters.grade}
        />
        <Button
          className="mt-6"
          icon={RefreshCw}
          loadingIconMotion="refresh"
          isLoading={isFetching}
          onClick={onReset}
          variant="outline"
        >
          รีเซ็ต
        </Button>
      </div>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: HomeDashboardMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = METRIC_ICONS[metric.key] ?? BarChart3;
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
            <div className="text-sm font-medium text-slate-700">{metric.label}</div>
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
  const maxTotal = Math.max(1, ...points.map((point) => point.total));
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900">แนวโน้มการมาเรียน</h2>
      <p className="mb-4 text-sm text-slate-500">รายวันจาก attendance DAILY ในขอบเขตเดียวกัน</p>
      {points.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="flex h-48 items-end gap-2" aria-hidden="true">
            {points.map((point) => (
              <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full max-w-10 flex-col justify-end overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="bg-danger-200"
                    style={{ height: `${(point.absent / maxTotal) * 100}%` }}
                  />
                  <div
                    className="bg-warning-200"
                    style={{ height: `${(point.late / maxTotal) * 100}%` }}
                  />
                  <div
                    className="bg-success-300"
                    style={{ height: `${(point.present / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="max-w-12 truncate text-xs text-slate-500">
                  {point.label.slice(5)}
                </span>
              </div>
            ))}
          </div>
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
      <p className="mb-4 text-sm text-slate-500">อิง `student_risk_profiles` ล่าสุด</p>
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
  const maxMovement = Math.max(1, ...(movement ?? []).map((point) => point.opened + point.resolved));
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
          {movement.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="mt-4 flex h-44 items-end gap-3" aria-hidden="true">
              {movement.map((point) => (
                <div key={point.key} className="flex flex-1 items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-primary"
                    style={{ height: `${(point.opened / maxMovement) * 100}%` }}
                  />
                  <div
                    className="w-3 rounded-t bg-success-500"
                    style={{ height: `${(point.resolved / maxMovement) * 100}%` }}
                  />
                </div>
              ))}
            </div>
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

function EmptyChart() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      ยังไม่มีข้อมูลพอสำหรับแสดงแนวโน้มในช่วงนี้
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
    isFetching,
    isError,
    isTrendsError,
    isFilterOptionsError,
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
        actions={
          <Button
            icon={RefreshCw}
            isLoading={isFetching}
            loadingIconMotion="refresh"
            onClick={refetch}
            variant="outline"
          >
            รีเฟรช
          </Button>
        }
      >
        <DashboardFilterBar
          filters={filters}
          options={filterOptions?.options}
          isFetching={isFetching}
          onReset={reset}
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
            <span>
              ข้อมูล ณ {formatThaiDateTime(summary.generatedAt)}
            </span>
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
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/50 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
