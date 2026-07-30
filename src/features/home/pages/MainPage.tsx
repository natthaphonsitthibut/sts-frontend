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
  HomeDashboardFilters,
  HomeDashboardMetric,
  HomeDashboardOption,
  HomeDashboardPeriod,
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

export function MainPage() {
  const { displayName, roleLabel, affiliation } = useCurrentUserPresentation();
  const { can } = usePermissions();
  const { filters, reset, updateFilter } = useDashboardFilters();
  const {
    summary,
    filterOptions,
    isLoading,
    isError,
    isFilterOptionsError,
    dataUpdatedAt,
    refetch,
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
      ? { to: "/cases", icon: BriefcaseBusiness, label: "เคสติดตาม" }
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
