import { cn } from "../../lib/utils";

export interface ChartLegendItem {
  className: string;
  label: string;
}

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", item.className)} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function EmptyChart() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      ยังไม่มีข้อมูลพอสำหรับแสดงแนวโน้มในช่วงนี้
    </div>
  );
}

interface StackedBarTrendPoint {
  key: string;
  label: string;
  values: number[];
}

export function StackedBarTrend({
  points,
  segmentClasses,
}: {
  points: StackedBarTrendPoint[];
  segmentClasses: string[];
}) {
  const maxTotal = Math.max(1, ...points.map((point) => point.values.reduce((sum, value) => sum + value, 0)));
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="flex h-48 items-end gap-2" aria-hidden="true">
      {points.map((point, index) => (
        <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex h-40 w-full max-w-10 flex-col justify-end overflow-hidden rounded-md bg-slate-100">
            {[...point.values].reverse().map((value, segmentIndex) => (
              <div
                key={`${point.key}-${segmentIndex}`}
                className={segmentClasses[point.values.length - segmentIndex - 1]}
                style={{ height: `${(value / maxTotal) * 100}%` }}
              />
            ))}
          </div>
          <span className="h-4 max-w-12 truncate text-xs text-slate-500">
            {index % labelStep === 0 || index === points.length - 1 ? point.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

interface PairedBarPoint {
  key: string;
  label: string;
  primary: number;
  secondary: number;
}

export function PairedBarChart({ points }: { points: PairedBarPoint[] }) {
  const maxValue = Math.max(1, ...points.map((point) => point.primary + point.secondary));

  return (
    <div className="mt-4 flex h-48 items-end gap-3" aria-hidden="true">
      {points.map((point) => (
        <div key={point.key} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="flex items-end gap-1">
            <div className="w-3 rounded-t bg-primary" style={{ height: `${(point.primary / maxValue) * 100}%` }} />
            <div className="w-3 rounded-t bg-success-500" style={{ height: `${(point.secondary / maxValue) * 100}%` }} />
          </div>
          <span className="max-w-full truncate text-xs text-slate-500">{point.label}</span>
        </div>
      ))}
    </div>
  );
}
