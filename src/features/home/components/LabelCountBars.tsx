import { cn } from "../../../lib/utils";
import type { HomeDashboardLabelCount } from "../types/home-dashboard.types";

interface LabelCountBarsProps {
  barClassName?: string | ((item: HomeDashboardLabelCount) => string);
  items: HomeDashboardLabelCount[];
  unit?: string;
}

/**
 * A ranked list of counts with the number always visible next to its bar. Shared
 * by every single-dimension breakdown on the page so สาเหตุ, ระดับความห่วงใย and
 * เหตุที่ตามไม่ถึงตัว are read the same way.
 */
export function LabelCountBars({
  barClassName = "bg-primary",
  items,
  unit = "คน",
}: LabelCountBarsProps) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-slate-700">
              {item.label}
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
              {item.count.toLocaleString("th-TH")} {unit}
            </span>
          </span>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100">
            <span
              className={cn(
                "block h-full rounded-full",
                typeof barClassName === "function"
                  ? barClassName(item)
                  : barClassName,
              )}
              style={{
                width: `${item.count === 0 ? 0 : Math.max((item.count / maxCount) * 100, 3)}%`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
