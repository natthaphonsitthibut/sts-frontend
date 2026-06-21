import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Input, Select, Skeleton } from "../base";
import { cn } from "../../lib/utils";

export const PAGE_MAX_WIDTH_CLASS = "max-w-[1100px]";

interface PageShellProps extends ComponentProps<"div"> {
  maxWidthClassName?: string;
}

export function PageShell({
  children,
  className,
  maxWidthClassName = PAGE_MAX_WIDTH_CLASS,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-full bg-gradient-to-b from-surface-app to-surface-soft p-6",
        className,
      )}
      {...props}
    >
      <div className={cn("mx-auto w-full", maxWidthClassName)}>{children}</div>
    </div>
  );
}

interface PageToolbarProps extends Omit<ComponentProps<"section">, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
  /** Color only — size/padding/structure stay identical across tones. */
  tone?: "default" | "primary";
}

const toolbarToneClasses: Record<
  NonNullable<PageToolbarProps["tone"]>,
  {
    surface: string;
    icon: string;
    iconSurface: string;
    title: string;
    description: string;
  }
> = {
  default: {
    surface: "border-slate-100 bg-white shadow-card",
    icon: "text-primary",
    iconSurface: "bg-surface-sky",
    title: "text-slate-800",
    description: "text-slate-500",
  },
  primary: {
    surface: "border-primary bg-primary shadow-card",
    icon: "text-white",
    iconSurface: "bg-white/15",
    title: "text-white",
    description: "text-white/80",
  },
};

export function PageToolbar({
  actions,
  children,
  className,
  description,
  icon: Icon,
  title,
  tone = "default",
  ...props
}: PageToolbarProps) {
  const toneClasses = toolbarToneClasses[tone];
  return (
    <div className="mb-5">
      {/* Header band — same fixed height on every page (controls live below, so a
          page with many filters never gets a taller header than one with none). */}
      <section
        className={cn("overflow-hidden rounded-lg border", toneClasses.surface, className)}
        {...props}
      >
        <div className="flex min-h-24 flex-col justify-center gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {Icon ? (
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClasses.iconSurface)}>
                <Icon className={cn("size-5", toneClasses.icon)} aria-hidden="true" />
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className={cn("truncate text-xl font-bold leading-8", toneClasses.title)}>
                {title}
              </h1>
              {description ? (
                <p className={cn("mt-1 text-sm", toneClasses.description)}>{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </section>
      {children ? (
        <div className="mt-5 rounded-lg border border-slate-100 bg-white p-4 shadow-card">
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface SearchInputProps {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  className?: string;
}

export function SearchInput({
  className,
  onChange,
  placeholder,
  value,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full sm:max-w-xs sm:flex-1", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input
        className="pl-9"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

interface FilterSelectProps {
  ariaLabel: string;
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
  className?: string;
}

export function FilterSelect({
  ariaLabel,
  children,
  className,
  onChange,
  value,
}: FilterSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      className={cn("sm:w-[180px]", className)}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </Select>
  );
}

export function ToolbarControls({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
      {...props}
    />
  );
}

interface CountBadgeProps {
  children: ReactNode;
  icon?: LucideIcon;
}

export function CountBadge({ children, icon: Icon }: CountBadgeProps) {
  return (
    <div className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-surface-sky px-4 text-sm font-bold text-primary">
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  );
}

interface ListToolbarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

interface ListToolbarCount {
  value: ReactNode;
  icon?: LucideIcon;
}

interface ListPageToolbarProps extends Omit<PageToolbarProps, "children"> {
  /** Optional search box — rendered first in the controls row. */
  search?: ListToolbarSearch;
  /** Filter controls (FilterSelect / Combobox …) — rendered after search. */
  filters?: ReactNode;
  /** Optional result count — rendered last as a CountBadge. */
  count?: ListToolbarCount;
}

/**
 * Canonical list-page header: one shell every list page shares so search,
 * filters and count always render in the same order with identical markup.
 * Composes the existing primitives (PageToolbar → ToolbarControls →
 * SearchInput/CountBadge) — not a new layout, just the uniform arrangement.
 * Inherits the full PageToolbar prop surface (title/description/icon/tone/
 * actions + section props), so it stays a superset, never a narrowing.
 */
export function ListPageToolbar({
  count,
  filters,
  search,
  ...toolbarProps
}: ListPageToolbarProps) {
  const hasControls = Boolean(search || filters || count);
  return (
    <PageToolbar {...toolbarProps}>
      {hasControls ? (
        <ToolbarControls>
          {search ? (
            <SearchInput
              onChange={search.onChange}
              placeholder={search.placeholder}
              value={search.value}
            />
          ) : null}
          {filters}
          {count ? <CountBadge icon={count.icon}>{count.value}</CountBadge> : null}
        </ToolbarControls>
      ) : null}
    </PageToolbar>
  );
}

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

const summaryToneClasses: Record<
  SummaryTone,
  { card: string; accent: string; value: string; iconBg: string; iconColor: string }
> = {
  default: {
    card: "border-slate-200 bg-white",
    accent: "bg-slate-300",
    value: "text-slate-900",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
  success: {
    card: "border-success-200 bg-white",
    accent: "bg-success",
    value: "text-success-700",
    iconBg: "bg-success-100",
    iconColor: "text-success-700",
  },
  warning: {
    card: "border-warning-200 bg-white",
    accent: "bg-warning",
    value: "text-warning-700",
    iconBg: "bg-warning-100",
    iconColor: "text-warning-700",
  },
  danger: {
    card: "border-danger-200 bg-white",
    accent: "bg-danger",
    value: "text-danger-700",
    iconBg: "bg-danger-100",
    iconColor: "text-danger-700",
  },
  info: {
    card: "border-primary/20 bg-white",
    accent: "bg-primary",
    value: "text-primary",
    iconBg: "bg-primary-soft",
    iconColor: "text-primary",
  },
};

interface SummaryMetric {
  label: ReactNode;
  value: ReactNode;
  tone?: SummaryTone;
  icon?: LucideIcon;
}

/** Column layouts keyed by card count — keeps metric grids consistent system-wide. */
const summaryColumnClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

interface SummaryMetricsProps {
  items: SummaryMetric[];
  /** Override the column count; defaults to a layout derived from item count. */
  columns?: keyof typeof summaryColumnClasses;
  className?: string;
}

export function SummaryMetrics({ className, columns, items }: SummaryMetricsProps) {
  const resolvedColumns = columns ?? (items.length >= 5 ? 6 : 4);
  const columnsClass =
    summaryColumnClasses[resolvedColumns] ?? summaryColumnClasses[4];
  return (
    <div className={cn("grid gap-3", columnsClass, className)}>
      {items.map((item, index) => {
        const tone = summaryToneClasses[item.tone ?? "default"];
        const Icon = item.icon;
        return (
          <div
            className={cn(
              "overflow-hidden rounded-lg border shadow-card",
              tone.card,
            )}
            key={index}
          >
            <div className={cn("h-1.5", tone.accent)} />
            <div className="flex items-center gap-3 p-4">
              {Icon ? (
                <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", tone.iconBg)}>
                  <Icon className={cn("size-5", tone.iconColor)} aria-hidden="true" />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-500">{item.label}</div>
                <div className={cn("text-2xl font-bold", tone.value)}>
                  {item.value}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ChoiceCardButtonProps extends Omit<ComponentProps<"button">, "title"> {
  description: ReactNode;
  icon: LucideIcon;
  selected: boolean;
  title: ReactNode;
}

export function ChoiceCardButton({
  className,
  description,
  icon: Icon,
  selected,
  title,
  type = "button",
  ...props
}: ChoiceCardButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg border bg-white p-5 text-left shadow-card transition-colors motion-reduce:transition-none",
        selected
          ? "border-primary bg-surface-sky"
          : "border-slate-200 hover:border-primary hover:bg-muted",
        className,
      )}
      type={type}
      {...props}
    >
      <Icon className="mb-3 size-6 text-primary" aria-hidden="true" />
      <div className="font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </button>
  );
}

interface ProgressBarProps {
  value: number;
  label?: ReactNode;
  className?: string;
}

export function ProgressBar({ className, label, value }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>{label}</span>
          <span>{normalizedValue}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalizedValue}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Canonical empty placeholder — dashed surface card, centered. */
export function EmptyState({
  action,
  className,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mx-auto mb-4 size-16 text-muted-foreground" aria-hidden="true" />
      ) : null}
      <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
      {description ? (
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Canonical inline error — destructive alert with an optional retry action. */
export function ErrorState({
  className,
  description = "เกิดข้อผิดพลาดระหว่างโหลดข้อมูล กรุณาลองใหม่อีกครั้ง",
  onRetry,
  retryLabel = "ลองโหลดอีกครั้ง",
  title = "ไม่สามารถโหลดข้อมูลได้",
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <AlertTitle>{title}</AlertTitle>
          {description ? <AlertDescription>{description}</AlertDescription> : null}
        </div>
        {onRetry ? (
          <Button className="shrink-0" onClick={onRetry} size="sm" variant="destructive">
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}

/** Skeleton grid mirroring a responsive card layout. */
export function SkeletonCards({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton mirroring a data table — header band plus evenly spaced rows. */
export function SkeletonTable({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white", className)}
      aria-busy="true"
    >
      <Skeleton className="h-12 w-full rounded-none" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic vertical skeleton stack for detail/summary panels. */
export function SkeletonStack({
  lines = 4,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
