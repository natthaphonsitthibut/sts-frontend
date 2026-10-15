import { ArrowLeft, MapPinned } from "lucide-react";
import { Button } from "../../../components/base";
import { ChartCard } from "./ChartCard";
import type {
  HomeDashboardFilters,
  HomeDashboardRiskAreaRanking,
} from "../types/home-dashboard.types";

interface RiskAreaRankingChartProps {
  backLabel?: string;
  onBack?: () => void;
  onSelect?: (filter: Partial<HomeDashboardFilters>) => void;
  ranking: HomeDashboardRiskAreaRanking;
}

export function RiskAreaRankingChart({
  backLabel,
  onBack,
  onSelect,
  ranking,
}: RiskAreaRankingChartProps) {
  const displayItems = ranking.items.slice(0, 5);
  const maxCount = Math.max(...displayItems.map((item) => item.count), 1);

  return (
    <ChartCard
      action={
        onBack && backLabel ? (
          <Button
            className="shrink-0 self-start"
            data-risk-area-back
            icon={ArrowLeft}
            onClick={onBack}
            size="sm"
            variant="outline"
          >
            {backLabel}
          </Button>
        ) : undefined
      }
      description="เรียงตามจำนวนนักเรียนระดับเสี่ยงในขอบเขตปัจจุบัน กดพื้นที่เพื่อดูระดับถัดไป"
      icon={MapPinned}
      testAttribute={{ "data-risk-area-dimension": ranking.dimension }}
      title={`พื้นที่ที่มีนักเรียนเสี่ยงสูง Top 5 ${ranking.dimensionLabel}`}
      tone="danger"
    >
      {displayItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          ไม่พบนักเรียนระดับเสี่ยงในขอบเขตนี้
        </div>
      ) : (
        <ol className="space-y-3">
          {displayItems.map((item, index) => (
            <li key={`${ranking.dimension}-${item.key}`}>
              <button
                aria-label={`${item.label} นักเรียนเสี่ยง ${item.count.toLocaleString("th-TH")} คน${onSelect ? " ดูระดับถัดไป" : ""}`}
                className="group w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:bg-transparent"
                data-risk-area-item={item.key}
                disabled={!onSelect}
                onClick={() => onSelect?.(item.targetFilter)}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {item.label}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                        {item.count.toLocaleString("th-TH")} คน
                      </span>
                    </span>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-danger transition-[width] duration-200 ease-out motion-reduce:transition-none"
                        style={{
                          width: `${Math.max((item.count / maxCount) * 100, 3)}%`,
                        }}
                      />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
