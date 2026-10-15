import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../../../components/base";
import { cn } from "../../../lib/utils";

type ChartCardTone = "primary" | "danger" | "warning" | "success";

export const HOME_CHART_CARD_CLASS =
  "flex h-[32rem] min-w-0 flex-col overflow-hidden p-4 sm:h-[36rem] sm:p-5";

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
  footer?: ReactNode;
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
  footer,
  icon: Icon,
  testAttribute,
  title,
  tone = "primary",
}: ChartCardProps) {
  return (
    <Card
      className={cn(HOME_CHART_CARD_CLASS, className)}
      data-home-chart-card={title}
      {...testAttribute}
    >
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-balance text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      <div
        aria-label={`ข้อมูล${title}`}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-sm px-1 pb-1 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        data-home-chart-body
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-slate-100 pt-3">{footer}</div>
      ) : null}
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
