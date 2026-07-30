import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  Clock,
  Siren,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Combobox } from "../../../components/base";
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
import { CasePipelineChart } from "../components/CasePipelineChart";
import { RiskAreaRankingChart } from "../components/RiskAreaRankingChart";
import { useCurrentUserPresentation } from "../hooks/useCurrentUserPresentation";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import type {
  HomeDashboardFilters,
  HomeDashboardMetric,
  HomeDashboardOption,
} from "../types/home-dashboard.types";

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
  info: "bg-brand-soft text-primary-dark",
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

function getRiskAreaBackAction(filters: HomeDashboardFilters): {
  label: string;
  next: Partial<HomeDashboardFilters>;
} | null {
  if (filters.schoolId) {
    return { label: "กลับไปดูทุกโรงเรียนในพื้นที่", next: { schoolId: undefined } };
  }
  if (filters.subDistrict) {
    return { label: "กลับไปดูตำบล/แขวง", next: { subDistrict: undefined } };
  }
  if (filters.district) {
    return { label: "กลับไปดูอำเภอ/เขต", next: { district: undefined } };
  }
  if (filters.province) {
    return { label: "กลับไปดูจังหวัด", next: { province: undefined } };
  }
  return null;
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

export function MainPage() {
  const { displayName, roleLabel, affiliation } = useCurrentUserPresentation();
  const { filters, reset, updateFilter } = useDashboardFilters();
  const riskAreaBackAction = getRiskAreaBackAction(filters);
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
            </div>
          </div>

          <MetricGrid metrics={summary.metrics} />

          <div
            className={cn(
              "grid gap-5",
              summary.riskAreaRanking &&
                summary.casePipeline &&
                "xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]",
            )}
          >
            {summary.riskAreaRanking ? (
              <RiskAreaRankingChart
                backLabel={riskAreaBackAction?.label}
                onBack={
                  riskAreaBackAction
                    ? () => updateFilter(riskAreaBackAction.next)
                    : undefined
                }
                onSelect={(filter) => updateFilter(filter)}
                ranking={summary.riskAreaRanking}
              />
            ) : null}
            {summary.casePipeline ? (
              <CasePipelineChart filters={filters} pipeline={summary.casePipeline} />
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
