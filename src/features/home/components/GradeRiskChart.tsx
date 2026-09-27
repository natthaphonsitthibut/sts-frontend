import { Layers } from "lucide-react";
import { Select } from "../../../components/base";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { SCOPE_ALL_LABEL } from "../../../lib/scope-presentation";
import { cn } from "../../../lib/utils";
import { ChartCard, ChartEmptyState } from "./ChartCard";
import type {
  HomeDashboardGradeRiskDistribution,
  HomeDashboardOption,
} from "../types/home-dashboard.types";

interface GradeRiskChartProps {
  distribution: HomeDashboardGradeRiskDistribution | null;
  grade?: string;
  room?: string;
  /** ชั้น choices of this school — the same list the page's scope filter uses. */
  gradeOptions: HomeDashboardOption[];
  /** ห้อง choices of the picked ชั้น. */
  roomOptions: HomeDashboardOption[];
  onGradeChange: (grade: string | undefined) => void;
  onRoomChange: (room: string | undefined) => void;
}

const TIERS = [
  { key: "HIGH" as const, label: "เสี่ยงสูง", className: "bg-tier-high" },
  { key: "WATCH" as const, label: "เฝ้าระวัง", className: "bg-tier-watch" },
  { key: "NORMAL" as const, label: "ปกติ", className: "bg-tier-normal" },
];

/**
 * ระดับความเสี่ยงแยกรายชั้น — the view that replaces the map once the scope is a
 * single school, because ชั้น is the unit that school can actually act on.
 * Picking a ชั้น (a bar, or the selector) turns the bars into that ชั้น's ห้อง;
 * a picked ห้อง stays highlighted among its siblings.
 */
export function GradeRiskChart({
  distribution,
  grade,
  room,
  gradeOptions,
  roomOptions,
  onGradeChange,
  onRoomChange,
}: GradeRiskChartProps) {
  const points = distribution?.points ?? [];
  const byRoom = distribution?.dimension === "ROOM";
  const totalHigh = points.reduce((sum, point) => sum + point.HIGH, 0);
  const gradeLabel =
    gradeOptions.find((option) => String(option.value) === grade)?.label ??
    grade;
  const pointLabel = (key: string) => (byRoom ? formatRoomLabel(key) : key);
  const scopeText = byRoom ? `ใน${gradeLabel}` : "ในโรงเรียนนี้";
  const hint = byRoom ? "กดที่ห้องเพื่อกรอง" : "กดที่ชั้นเพื่อดูรายห้อง";

  return (
    <ChartCard
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            aria-label="ชั้น"
            className="sm:w-40"
            onChange={(event) => onGradeChange(event.target.value || undefined)}
            value={grade ?? ""}
          >
            <option value="">{SCOPE_ALL_LABEL.grade}</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="ห้อง"
            className="sm:w-36"
            disabled={!grade}
            onChange={(event) => onRoomChange(event.target.value || undefined)}
            value={room ?? ""}
          >
            <option value="">{SCOPE_ALL_LABEL.room}</option>
            {roomOptions.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {formatRoomLabel(option.value)}
              </option>
            ))}
          </Select>
        </div>
      }
      description={
        points.length > 0
          ? `นักเรียนเสี่ยงสูงรวม ${totalHigh.toLocaleString("th-TH")} คน${scopeText} ${hint}`
          : `ยังไม่มีข้อมูลนักเรียน${scopeText}`
      }
      icon={Layers}
      testAttribute={{ "data-grade-risk": byRoom ? "room" : "grade" }}
      title={byRoom ? "ระดับความเสี่ยงแยกรายห้อง" : "ระดับความเสี่ยงแยกรายชั้น"}
      tone="danger"
    >
      {points.length === 0 ? (
        <ChartEmptyState message="ไม่มีข้อมูลนักเรียนในขอบเขตนี้" />
      ) : (
        <>
          <ul className="space-y-3">
            {points.map((point) => {
              const label = pointLabel(point.label);
              const selected = byRoom && room === point.key;
              return (
                <li key={point.key}>
                  <button
                    aria-label={`${label} เสี่ยงสูง ${point.HIGH} คน เฝ้าระวัง ${point.WATCH} คน ปกติ ${point.NORMAL} คน`}
                    aria-pressed={byRoom ? selected : undefined}
                    className={cn(
                      "w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selected && "bg-primary-50 ring-1 ring-primary/40",
                    )}
                    data-grade-risk-item={point.key}
                    onClick={() =>
                      byRoom
                        ? onRoomChange(selected ? undefined : point.key)
                        : onGradeChange(point.key)
                    }
                    type="button"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {label}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        เสี่ยงสูง{" "}
                        <b className="text-danger-700">
                          {point.HIGH.toLocaleString("th-TH")}
                        </b>{" "}
                        / {point.total.toLocaleString("th-TH")} คน
                      </span>
                    </span>
                    <span className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                      {TIERS.map((tier) => (
                        <span
                          className={cn("block h-full", tier.className)}
                          key={tier.key}
                          style={{
                            width: `${(point[tier.key] / Math.max(point.total, 1)) * 100}%`,
                          }}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            {TIERS.map((tier) => (
              <li className="flex items-center gap-1.5" key={tier.key}>
                <span className={cn("size-2.5 rounded-full", tier.className)} />
                {tier.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  );
}
