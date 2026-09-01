import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../../../components/base";
import { cn } from "../../../lib/utils";

type ChartCardTone = "primary" | "danger" | "warning" | "success";

const TONE_CLASSES: Record<ChartCardTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  danger: "bg-danger-100 text-danger-700",
  warning: "bg-warning-100 text-warning-700",
  success: "bg-success-100 text-success-700",
};

interface ChartCardProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description: string;
  icon: LucideIcon;
  testAttribute?: Record<string, string>;
  title: string;
  tone?: ChartCardTone;
}

/**
 * The shared frame for every chart on หน้าหลัก: icon, title, one line saying what
 * the numbers mean, then the chart. Kept as one component so a card added later
 * cannot drift from the others.
 */
export function ChartCard({
  action,
  children,
  className,
  description,
  icon: Icon,
  testAttribute,
  title,
  tone = "primary",
}: ChartCardProps) {
  return (
    <Card className={cn("p-4 sm:p-5", className)} {...testAttribute}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

interface PanelSectionProps {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}

/**
 * A chart living inside a panel. It carries no frame of its own — the panel is
 * already the card, and a card inside a card is always the wrong answer. The
 * heading is one step quieter than a standalone card's for the same reason.
 */
export function PanelSection({
  children,
  className,
  description,
  title,
}: PanelSectionProps) {
  return (
    <section className={cn("min-w-0", className)}>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      {message}
    </div>
  );
}
