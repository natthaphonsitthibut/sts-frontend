import { lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  BriefcaseBusiness,
  Siren,
  Users,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Combobox,
  Select,
  type ComboboxOption,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { getPageIdentity } from "../../../components/layout/page-identity";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { cn } from "../../../lib/utils";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { AttendanceTrendChart } from "../components/AttendanceTrendChart";
import { CasePipelineChart } from "../components/CasePipelineChart";
import { GradeRiskChart } from "../components/GradeRiskChart";
import { RiskAreaRankingChart } from "../components/RiskAreaRankingChart";
import { RiskInsightsPanel } from "../components/RiskInsightsPanel";
import { useCurrentUserPresentation } from "../hooks/useCurrentUserPresentation";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import type {
  HomeDashboardFilters,
  HomeDashboardMetric,
  HomeDashboardOption,
} from "../types/home-dashboard.types";
import { SCOPE_ALL_LABEL } from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";

const GeoMapSVG = lazy(() => import("../components/GeoMapSVG"));

const METRIC_ICONS: Record<string, typeof Users> = {
  totalStudents: Users,
  watchStudents: Siren,
  totalCases: ClipboardList,
  inProgressCases: BriefcaseBusiness,
  resolvedCases: CheckCircle2,
};

const TONE_CLASSES: Record<HomeDashboardMetric["tone"], string> = {
  default: "bg-slate-50 text-slate-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-brand-soft text-primary",
};

const METRIC_ICON_TONE_CLASSES: Record<HomeDashboardMetric["tone"], string> = {
  default: "bg-slate-700 text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  info: "bg-primary text-white",
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
  Object.entries(base as Record<string, string | number | undefined>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    },
  );
  const query = params.toString();
  return query ? `?${query}` : "";
}

function destination(
  path: string,
  query?: Record<string, string | number>,
): string {
  return `${path}${buildQuery(query)}`;
}

function getRiskAreaBackAction(
  filters: HomeDashboardFilters,
  schoolLocked: boolean,
): {
  label: string;
  next: Partial<HomeDashboardFilters>;
} | null {
  if (filters.room) {
    return { label: "กลับไปดูทุกห้องในชั้นนี้", next: { room: undefined } };
  }
  if (filters.grade) {
    return { label: "กลับไปดูทุกชั้นในโรงเรียน", next: { grade: undefined } };
  }
  if (schoolLocked) return null;
  if (filters.schoolId) {
    return {
      label: "กลับไปดูทุกโรงเรียนในพื้นที่",
      next: { schoolId: undefined },
    };
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

function getLockedSchoolId(
  schoolIds: number[] | undefined,
): number | undefined {
  return schoolIds?.length === 1 ? schoolIds[0] : undefined;
}

function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lockedSchoolId = useAuthSessionStore((state) =>
    getLockedSchoolId(state.user?.data_scope?.school_ids),
  );
  const parsedFilters = parseFilters(searchParams);
  const filters: HomeDashboardFilters = {
    ...parsedFilters,
    schoolId: lockedSchoolId ?? parsedFilters.schoolId,
  };

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
    if (lockedSchoolId) {
      merged.schoolId = lockedSchoolId;
    }
    setSearchParams(buildQuery(merged).slice(1), { replace: true });
  }

  function reset(): void {
    setSearchParams(
      buildQuery({
        period: "30_DAYS",
        schoolId: lockedSchoolId,
      }).slice(1),
      { replace: true },
    );
  }

  return {
    filters,
    reset,
    schoolLocked: lockedSchoolId !== undefined,
    updateFilter,
  };
}

function DashboardFilterBar({
  filters,
  options,
  onReset,
  onUpdate,
  schoolLocked,
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
  onReset: () => void;
  onUpdate: (next: Partial<HomeDashboardFilters>) => void;
  schoolLocked: boolean;
}) {
  const safeOptions = options ?? {
    provinces: [],
    districts: [],
    subDistricts: [],
    schools: [],
    grades: [],
    rooms: [],
  };
  const allOption = (
    label: string,
    options: HomeDashboardOption[],
  ): ComboboxOption[] => [
    { value: "", label },
    ...options.map((option) => ({
      value: String(option.value),
      label: option.label,
    })),
  ];
  const labelOf = (
    options: HomeDashboardOption[],
    value: string | number | undefined,
  ): string | undefined =>
    value === undefined || value === ""
      ? undefined
      : options.find((option) => String(option.value) === String(value))?.label;

  return (
    <ScopeFilterField
      onClear={onReset}
      scope={{
        province: filters.province,
        district: filters.district,
        subDistrict: filters.subDistrict,
        schoolName: labelOf(safeOptions.schools, filters.schoolId),
        grade: labelOf(safeOptions.grades, filters.grade),
        room: filters.room,
      }}
    >
      <Combobox
        ariaLabel="จังหวัด"
        options={allOption(SCOPE_ALL_LABEL.province, safeOptions.provinces)}
        placeholder={SCOPE_ALL_LABEL.province}
        value={filters.province ?? ""}
        onChange={(value) => onUpdate({ province: value || undefined })}
        disabled={schoolLocked}
      />
      <Combobox
        ariaLabel="อำเภอ/เขต"
        options={allOption(SCOPE_ALL_LABEL.district, safeOptions.districts)}
        placeholder={SCOPE_ALL_LABEL.district}
        value={filters.district ?? ""}
        onChange={(value) => onUpdate({ district: value || undefined })}
        disabled={schoolLocked || !filters.province}
      />
      <Combobox
        ariaLabel="ตำบล/แขวง"
        options={allOption(
          SCOPE_ALL_LABEL.subDistrict,
          safeOptions.subDistricts,
        )}
        placeholder={SCOPE_ALL_LABEL.subDistrict}
        value={filters.subDistrict ?? ""}
        onChange={(value) => onUpdate({ subDistrict: value || undefined })}
        disabled={schoolLocked || !filters.district}
      />
      <Combobox
        ariaLabel="โรงเรียน"
        options={allOption(SCOPE_ALL_LABEL.school, safeOptions.schools)}
        placeholder={SCOPE_ALL_LABEL.school}
        value={filters.schoolId === undefined ? "" : String(filters.schoolId)}
        onChange={(value) =>
          onUpdate({ schoolId: value ? Number(value) : undefined })
        }
        disabled={schoolLocked}
      />
      <Select
        aria-label="ชั้น"
        onChange={(event) =>
          onUpdate({ grade: event.target.value || undefined })
        }
        disabled={!filters.schoolId}
        value={filters.grade ?? ""}
      >
        <option value="">{SCOPE_ALL_LABEL.grade}</option>
        {safeOptions.grades.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="ห้อง"
        onChange={(event) =>
          onUpdate({ room: event.target.value || undefined })
        }
        disabled={!filters.grade}
        value={filters.room ?? ""}
      >
        <option value="">{SCOPE_ALL_LABEL.room}</option>
        {safeOptions.rooms.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {formatRoomLabel(option.value)}
          </option>
        ))}
      </Select>
    </ScopeFilterField>
  );
}

function MetricGrid({ metrics }: { metrics: HomeDashboardMetric[] }) {
  // Every role reads the same overview; only the jump into the underlying page
  // is a permission, so a card the account cannot open stays a plain card.
  const { canOpen } = usePermissions();

  return (
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric) => {
        const pageIdentity = getPageIdentity(metric.targetPath);
        const Icon =
          METRIC_ICONS[metric.key] ?? pageIdentity?.icon ?? BarChart3;
        const comparison = metric.comparison ?? {
          value: "—%",
          description: "ไม่มีข้อมูลเทียบปีการศึกษาที่แล้ว",
          tone: "default" as const,
        };
        const openable = canOpen(metric.targetPath);
        const cardClassName = cn(
          "flex min-h-24 flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3.5 text-left shadow-card",
          openable &&
            "transition-colors hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        );
        const lockedHint = openable
          ? undefined
          : "บัญชีนี้ไม่มีสิทธิ์เปิดหน้ารายงานปลายทาง";
        const cardContent = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base text-content-secondary">
                  {metric.label}
                </div>
                <div className="animate-value-in text-3xl font-bold leading-tight tabular-nums text-slate-950">
                  {metric.value.toLocaleString("th-TH")}
                </div>
              </div>
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  METRIC_ICON_TONE_CLASSES[metric.tone],
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
                  TONE_CLASSES[comparison.tone],
                )}
              >
                {comparison.value}
              </span>
              <span className="truncate text-slate-500">
                {comparison.description}
              </span>
            </div>
          </>
        );
        return openable ? (
          <Link
            key={metric.key}
            className={cardClassName}
            data-home-metric={metric.key}
            to={destination(metric.targetPath, metric.targetQuery)}
          >
            {cardContent}
          </Link>
        ) : (
          <div
            key={metric.key}
            className={cardClassName}
            data-home-metric={metric.key}
            data-home-metric-locked="true"
            title={lockedHint}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}

export function MainPage() {
  const { displayName, roleLabel, affiliation } = useCurrentUserPresentation();
  const { canOpen } = usePermissions();
  const { filters, reset, schoolLocked, updateFilter } = useDashboardFilters();
  const riskAreaBackAction = getRiskAreaBackAction(filters, schoolLocked);
  const {
    summary,
    filterOptions,
    trends,
    followUpInsights,
    isLoading,
    isError,
    isFilterOptionsError,
    isFollowUpInsightsError,
    refetch,
    refetchFilterOptions,
    refetchFollowUpInsights,
  } = useHomeDashboard(filters);
  // One school on a national choropleth is an empty map; ชั้น/ห้อง is the unit a
  // school actually works with, so the whole slot swaps rather than showing a
  // greyed-out country.
  const isSchoolScope = filters.schoolId !== undefined;
  // Gated the same way the metric cards are: a card the account cannot open
  // stays a plain card rather than a link into /forbidden.
  const highRiskPath = !canOpen("/student-risk-report")
    ? null
    : destination("/student-risk-report", {
        ...(filters.province ? { province: filters.province } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.subDistrict ? { subDistrict: filters.subDistrict } : {}),
        ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
        ...(filters.grade ? { grade: filters.grade } : {}),
        ...(filters.room ? { room: filters.room } : {}),
        riskTier: "HIGH",
      });

  return (
    <PageShell>
      <PageToolbar
        icon={Activity}
        title="ศูนย์สั่งการวันนี้"
        description={`${displayName} · ${roleLabel} · ${affiliation}`}
        scope={
          <DashboardFilterBar
            filters={filters}
            options={filterOptions?.options}
            onReset={reset}
            onUpdate={updateFilter}
            schoolLocked={schoolLocked}
          />
        }
      />

      {isFilterOptionsError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>โหลดตัวเลือกขอบเขตไม่สำเร็จ</AlertTitle>
          <AlertDescription>
            ข้อมูลสรุปยังใช้งานได้ แต่ยังเปลี่ยนขอบเขตไม่ได้
          </AlertDescription>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => void refetchFilterOptions()}
          >
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
        <div className="space-y-5 ">
          <MetricGrid metrics={summary.metrics} />

          <div
            className={cn(
              "grid gap-5 items-stretch",
              (summary.riskAreaRanking || summary.casePipeline) &&
                "xl:grid-cols-[minmax(0,6fr)_minmax(320px,4fr)]",
            )}
          >
            <div className="flex flex-col gap-5">
              {isSchoolScope ? (
                <GradeRiskChart
                  onSelect={(grade) => updateFilter({ grade })}
                  points={trends?.gradeRiskDistribution ?? []}
                />
              ) : (
                <Suspense
                  fallback={
                    <div
                      aria-label="กำลังโหลดแผนที่ประเทศไทย"
                      className="min-h-[28rem] animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                      role="status"
                    />
                  }
                >
                  <GeoMapSVG
                    backLabel={riskAreaBackAction?.label}
                    disabled={schoolLocked}
                    filters={filters}
                    onBack={
                      riskAreaBackAction
                        ? () => updateFilter(riskAreaBackAction.next)
                        : undefined
                    }
                    onSelect={schoolLocked ? undefined : updateFilter}
                    ranking={summary.riskAreaRanking}
                  />
                </Suspense>
              )}

              <AttendanceTrendChart points={trends?.attendanceTrend ?? []} />
            </div>

            <div className="flex flex-col gap-5">
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
                <CasePipelineChart
                  filters={filters}
                  pipeline={summary.casePipeline}
                />
              ) : null}
            </div>
          </div>

          {isFollowUpInsightsError ? (
            <Alert variant="destructive">
              <AlertTitle>โหลดภาพรวมความเสี่ยงไม่สำเร็จ</AlertTitle>
              <AlertDescription>
                ตัวเลขส่วนอื่นของหน้าหลักยังใช้งานได้ตามปกติ
              </AlertDescription>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => void refetchFollowUpInsights()}
              >
                โหลดใหม่
              </Button>
            </Alert>
          ) : !followUpInsights ? (
            <SkeletonCards count={1} />
          ) : (
            <RiskInsightsPanel
              insights={followUpInsights}
              monthlySuccessRates={summary.monthlySuccessRates ?? null}
              unclassifiedPath={highRiskPath}
            />
          )}
        </div>
      )}
    </PageShell>
  );
}
