import { lazy, Suspense, useEffect, useRef } from "react";
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
  Select,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { ErrorBoundary } from "../../../components/layout/error-boundary";
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
  HomeDashboardTrendPoint,
} from "../types/home-dashboard.types";
import { SCOPE_ALL_LABEL } from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";

const GeoMapSVG = lazy(() => import("../components/GeoMapSVG"));

// `?? []` builds a new array on every render, and recharts re-dispatches the
// whole dataset into its internal store whenever that identity changes. Empty
// is a constant, so treat it as one.
const NO_TREND_POINTS: HomeDashboardTrendPoint[] = [];

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

// Area/school no longer live in this page's URL (the header owns them) —
// only period/grade/room are still parsed from it.
function parseFilters(searchParams: URLSearchParams): HomeDashboardFilters {
  const period = searchParams.get("period");
  return {
    period:
      period === "7_DAYS" || period === "CURRENT_TERM" || period === "30_DAYS"
        ? period
        : "30_DAYS",
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

/**
 * Area and school are the shared header filter, not this page's own URL
 * params — narrowing to a province, a district or one school here (or on any
 * other browse/dashboard page) carries over everywhere else. "ทุกโรงเรียน"
 * on top of a chosen area means every school *in that area*, not a reset to
 * nationwide — so picking a school only ever narrows the area already in
 * force, and clearing the school leaves it in place. Grade/room stay this
 * page's own, URL-persisted as before, since they only mean anything inside
 * one specific school.
 */
function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lockedSchoolId = useAuthSessionStore((state) =>
    getLockedSchoolId(state.user?.data_scope?.school_ids),
  );
  const globalFilter = useGlobalSchoolFilter();
  const globalSchoolId = globalFilter.schoolId
    ? Number(globalFilter.schoolId)
    : undefined;
  const parsedFilters = parseFilters(searchParams);
  const filters: HomeDashboardFilters = {
    period: parsedFilters.period,
    province: lockedSchoolId ? undefined : globalFilter.province || undefined,
    district: lockedSchoolId ? undefined : globalFilter.district || undefined,
    subDistrict: lockedSchoolId
      ? undefined
      : globalFilter.subDistrict || undefined,
    schoolId: lockedSchoolId ?? globalSchoolId,
    grade: parsedFilters.grade,
    room: parsedFilters.room,
  };

  // A school change bypasses `updateFilter` entirely when it happens from
  // the header (or the risk-area back-action) — clear grade/room whenever
  // the effective school changes for any reason, so clearing the school
  // there can never leave a hidden, unclearable grade/room filter applied.
  const previousSchoolIdRef = useRef(filters.schoolId);
  useEffect(() => {
    if (previousSchoolIdRef.current === filters.schoolId) return;
    previousSchoolIdRef.current = filters.schoolId;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("grade");
        next.delete("room");
        return next;
      },
      { replace: true },
    );
  }, [filters.schoolId, setSearchParams]);

  function updateFilter(next: Partial<HomeDashboardFilters>): void {
    const touchesArea =
      "province" in next ||
      "district" in next ||
      "subDistrict" in next ||
      "schoolId" in next;

    if (!lockedSchoolId && touchesArea) {
      if ("schoolId" in next) {
        if (next.schoolId) {
          globalFilter.setSchool(String(next.schoolId), "");
        } else {
          globalFilter.clearSchool();
        }
      } else if ("subDistrict" in next) {
        globalFilter.setArea({
          province: filters.province ?? "",
          district: filters.district ?? "",
          subDistrict: next.subDistrict ?? "",
        });
      } else if ("district" in next) {
        globalFilter.setArea({
          province: filters.province ?? "",
          district: next.district ?? "",
          subDistrict: "",
        });
      } else if ("province" in next) {
        globalFilter.setArea({
          province: next.province ?? "",
          district: "",
          subDistrict: "",
        });
      }
    }

    const nextPeriod = "period" in next ? next.period : filters.period;
    const nextGrade =
      "grade" in next ? next.grade : touchesArea ? undefined : filters.grade;
    const nextRoom =
      "room" in next
        ? next.room
        : touchesArea || "grade" in next
          ? undefined
          : filters.room;
    setSearchParams(
      buildQuery({
        period: nextPeriod,
        grade: nextGrade,
        room: nextRoom,
      }).slice(1),
      { replace: true },
    );
  }

  // Clears only what this page still owns (grade/room) — the area/school is
  // the header's own filter now, with its own clear action.
  function reset(): void {
    setSearchParams(buildQuery({ period: "30_DAYS" }).slice(1), {
      replace: true,
    });
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
}) {
  const safeOptions = options ?? {
    provinces: [],
    districts: [],
    subDistricts: [],
    schools: [],
    grades: [],
    rooms: [],
  };
  const labelOf = (
    options: HomeDashboardOption[],
    value: string | number | undefined,
  ): string | undefined =>
    value === undefined || value === ""
      ? undefined
      : options.find((option) => String(option.value) === String(value))?.label;

  // Area and school are the header's own filter now (see
  // `GlobalSchoolFilterControl`) — grade/room only mean anything once a
  // school is picked, so this field doesn't exist until then either.
  if (!filters.schoolId) return null;

  return (
    <ScopeFilterField
      emptyLabel={`${SCOPE_ALL_LABEL.grade} · ${SCOPE_ALL_LABEL.room}`}
      label="ชั้น/ห้อง"
      onClear={onReset}
      scope={{
        omitPlace: true,
        grade: labelOf(safeOptions.grades, filters.grade),
        room: filters.room,
      }}
    >
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
            "transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
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
  const globalFilter = useGlobalSchoolFilter();
  const riskAreaBackAction = getRiskAreaBackAction(filters, schoolLocked);
  // Value-stable (a query string, not the filters object), so a caught
  // boundary retries on a real scope change and not on every render.
  const scopeKey = buildQuery(filters);
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
  // This page only ever hands the header filter a school id — its label
  // catches up once the scoped options list resolves, so the pill never
  // shows a stale name for a school picked from a chart or a back-action.
  const resolvedSchoolName = filterOptions?.options?.schools.find(
    (school) => String(school.value) === String(filters.schoolId ?? ""),
  )?.label;
  useEffect(() => {
    if (schoolLocked || !filters.schoolId || !resolvedSchoolName) return;
    if (resolvedSchoolName === globalFilter.schoolName) return;
    globalFilter.setSchool(String(filters.schoolId), resolvedSchoolName);
  }, [filters.schoolId, resolvedSchoolName, schoolLocked, globalFilter]);
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
        // ชั้น/ห้อง only exists once a school is picked; before that there is
        // nothing to show, so no row is reserved for it.
        scope={
          filters.schoolId ? (
            <DashboardFilterBar
              filters={filters}
              options={filterOptions?.options}
              onReset={reset}
              onUpdate={updateFilter}
            />
          ) : undefined
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
                  distribution={trends?.gradeRiskDistribution ?? null}
                  grade={filters.grade}
                  gradeOptions={filterOptions?.options?.grades ?? []}
                  onGradeChange={(grade) => updateFilter({ grade })}
                  onRoomChange={(room) => updateFilter({ room })}
                  room={filters.room}
                  roomOptions={filterOptions?.options?.rooms ?? []}
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

              <ErrorBoundary
                resetKey={scopeKey}
                title="แสดงกราฟแนวโน้มการมาเรียนไม่สำเร็จ"
              >
                <AttendanceTrendChart
                  points={trends?.attendanceTrend ?? NO_TREND_POINTS}
                />
              </ErrorBoundary>
            </div>

            <ErrorBoundary
              className="self-start"
              resetKey={scopeKey}
              title="แสดงอันดับพื้นที่เสี่ยงไม่สำเร็จ"
            >
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
            </ErrorBoundary>
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
            <ErrorBoundary
              resetKey={scopeKey}
              title="แสดงภาพรวมความเสี่ยงไม่สำเร็จ"
            >
              <RiskInsightsPanel
                insights={followUpInsights}
                monthlySuccessRates={summary.monthlySuccessRates ?? null}
                unclassifiedPath={highRiskPath}
              />
            </ErrorBoundary>
          )}
        </div>
      )}
    </PageShell>
  );
}
