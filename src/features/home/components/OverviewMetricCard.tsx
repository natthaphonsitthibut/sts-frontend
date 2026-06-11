import type { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

export type MetricTone =
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "slate"
  | "cyan";

export type MetricSize = "compact" | "hero";

interface OverviewMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  tone?: MetricTone;
  size?: MetricSize;
}

const toneClasses: Record<
  MetricTone,
  { card: string; accent: string; icon: string; value: string }
> = {
  emerald: {
    card: "border-success-200 bg-white",
    accent: "bg-success",
    icon: "bg-success-100 text-success-700",
    value: "text-success-700",
  },
  amber: {
    card: "border-warning-200 bg-white",
    accent: "bg-warning",
    icon: "bg-warning-100 text-warning-700",
    value: "text-warning-700",
  },
  rose: {
    card: "border-danger-200 bg-white",
    accent: "bg-danger",
    icon: "bg-danger-100 text-danger-700",
    value: "text-danger-700",
  },
  sky: {
    card: "border-primary/20 bg-white",
    accent: "bg-primary",
    icon: "bg-surface-sky text-primary",
    value: "text-primary",
  },
  slate: {
    card: "border-slate-200 bg-white",
    accent: "bg-slate-300",
    icon: "bg-slate-100 text-slate-700",
    value: "text-slate-900",
  },
  cyan: {
    card: "border-primary/20 bg-white",
    accent: "bg-primary",
    icon: "bg-surface-cyan text-primary",
    value: "text-primary",
  },
};

const valueSizeClasses: Record<MetricSize, string> = {
  compact: "text-3xl",
  hero: "text-6xl max-md:text-5xl",
};

export function OverviewMetricCard({
  label,
  value,
  icon: Icon,
  subtitle,
  tone = "sky",
  size = "compact",
}: OverviewMetricCardProps) {
  const displayValue =
    typeof value === "number" ? value.toLocaleString() : value;
  const toneClass = toneClasses[tone];

  return (
    <div
      className={cn(
        "flex min-h-full flex-col justify-between overflow-hidden rounded-lg border shadow-card",
        toneClass.card,
      )}
    >
      <div className={cn("h-1.5", toneClass.accent)} />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900">{label}</div>
            {subtitle ? (
              <div className="mt-1.5 text-sm text-slate-600">
                {subtitle}
              </div>
            ) : null}
          </div>
          <div className={cn("flex size-[54px] shrink-0 items-center justify-center rounded-lg", toneClass.icon)}>
            <Icon className="size-6" aria-hidden="true" />
          </div>
        </div>
        <div
          className={cn(
            "mt-[22px] font-extrabold leading-[0.92]",
            valueSizeClasses[size],
            toneClass.value,
          )}
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
}
