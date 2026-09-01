import { Layers } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ChartCard, ChartEmptyState } from "./ChartCard";
import type { HomeDashboardGradeRiskPoint } from "../types/home-dashboard.types";

interface GradeRiskChartProps {
  onSelect?: (grade: string) => void;
  points: HomeDashboardGradeRiskPoint[];
}

const TIERS = [
  { key: "HIGH" as const, label: "เสี่ยงสูง", className: "bg-tier-high" },
  { key: "WATCH" as const, label: "เฝ้าระวัง", className: "bg-tier-watch" },
  { key: "NORMAL" as const, label: "ปกติ", className: "bg-tier-normal" },
];

/**
 * ระดับความเสี่ยงแยกรายชั้น — the view that replaces the map once the scope is a
 * single school, because ชั้น is the unit that school can actually act on.
 */
export function GradeRiskChart({ onSelect, points }: GradeRiskChartProps) {
  const totalHigh = points.reduce((sum, point) => sum + point.HIGH, 0);

  return (
    <ChartCard
      description={
        points.length > 0
          ? `นักเรียนเสี่ยงสูงรวม ${totalHigh.toLocaleString("th-TH")} คนในโรงเรียนนี้ กดที่ชั้นเพื่อดูรายห้อง`
          : "ยังไม่มีข้อมูลนักเรียนในโรงเรียนนี้"
      }
      icon={Layers}
      testAttribute={{ "data-grade-risk": "true" }}
      title="ระดับความเสี่ยงแยกรายชั้น"
      tone="danger"
    >
      {points.length === 0 ? (
        <ChartEmptyState message="ไม่มีข้อมูลนักเรียนในขอบเขตนี้" />
      ) : (
        <>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point.key}>
                <button
                  aria-label={`${point.label} เสี่ยงสูง ${point.HIGH} คน เฝ้าระวัง ${point.WATCH} คน ปกติ ${point.NORMAL} คน`}
                  className="w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:bg-transparent"
                  data-grade-risk-item={point.key}
                  disabled={!onSelect}
                  onClick={() => onSelect?.(point.key)}
                  type="button"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {point.label}
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
            ))}
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
