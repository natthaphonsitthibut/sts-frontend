import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Combobox,
  Input,
  Select,
  Skeleton,
  type ComboboxOption,
} from "../base";
import { cn } from "../../lib/utils";
import { ClearFiltersButton } from "./clear-filters-button";
import { getPageIdentity, PAGE_ICONS } from "./page-identity";

export const PAGE_MAX_WIDTH_CLASS = "max-w-[1180px]";

type PageShellProps = ComponentProps<"div">;

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] bg-surface-page px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
        className,
      )}
      {...props}
    >
      <div
        className={cn("mx-auto w-full", PAGE_MAX_WIDTH_CLASS)}
        data-page-container="authenticated"
      >
        {children}
      </div>
    </div>
  );
}

interface PageToolbarProps extends Omit<ComponentProps<"section">, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  footerActions?: ReactNode;
  icon?: LucideIcon;
  title?: ReactNode;
  /** Color only — size/padding/structure stay identical across tones. */
  tone?: "default" | "primary";
}

const toolbarToneClasses: Record<
  NonNullable<PageToolbarProps["tone"]>,
  {
    surface: string;
    title: string;
    description: string;
  }
> = {
  default: {
    surface: "bg-transparent",
    title: "text-content-primary",
    description: "text-content-secondary",
  },
  primary: {
    surface: "border-primary bg-primary shadow-card",
    title: "text-white",
    description: "text-white/80",
  },
};

export function PageToolbar({
  actions,
  children,
  className,
  description,
  footerActions,
  icon: Icon,
  title,
  tone = "default",
  ...props
}: PageToolbarProps) {
  const { pathname } = useLocation();
  const pageIdentity = getPageIdentity(pathname);
  const ToolbarIcon = pageIdentity?.icon ?? Icon;
  const toolbarTitle = pageIdentity?.title ?? title;
  const isHomePage = pathname === "/";
  const toneClasses = toolbarToneClasses[tone];
  const hasAttachedSurface = Boolean(children || footerActions);
  return (
    <div className={cn("relative z-20", hasAttachedSurface ? "mb-6" : "mb-4")}>
      <section
        className={cn(
          "overflow-hidden",
          tone === "primary" && "rounded-lg border",
          toneClasses.surface,
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col",
            tone === "primary" ? "min-h-20 p-5" : "py-1",
          )}
        >
          <nav
            aria-label="เส้นทางนำทาง"
            className={cn(
              "flex min-h-6 items-center gap-2 text-sm font-medium",
              tone === "primary" ? "text-white/80" : "text-content-secondary",
            )}
          >
            {isHomePage ? (
              <span
                className={cn(
                  "inline-flex min-w-0 items-center gap-1.5",
                  tone === "primary" ? "text-white" : "text-content-primary",
                )}
                aria-current="page"
              >
                <PAGE_ICONS.home
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">หน้าหลัก</span>
              </span>
            ) : (
              <>
                <Link
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    tone === "primary"
                      ? "hover:text-white"
                      : "hover:text-content-primary",
                  )}
                  to="/"
                >
                  <PAGE_ICONS.home className="size-4" aria-hidden="true" />
                  <span>หน้าหลัก</span>
                </Link>
                <ChevronRight
                  className="size-4 shrink-0 opacity-60"
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5",
                    tone === "primary" ? "text-white" : "text-content-primary",
                  )}
                  aria-current="page"
                >
                  {ToolbarIcon ? (
                    <ToolbarIcon
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{toolbarTitle}</span>
                </span>
              </>
            )}
          </nav>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1
                className={cn(
                  "text-xl font-semibold leading-8",
                  toneClasses.title,
                )}
              >
                {toolbarTitle}
              </h1>
              {description ? (
                <p
                  className={cn(
                    "mt-1 max-w-3xl text-sm leading-6",
                    toneClasses.description,
                  )}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {hasAttachedSurface ? (
        <div
          className={cn(
            "mt-4 overflow-visible rounded-lg border border-slate-200 bg-white",
          )}
        >
          {children ? <div className="p-4">{children}</div> : null}
          {footerActions ? (
            <div
              className={cn(
                "rounded-b-lg bg-slate-50 px-4 py-3",
                !children && "rounded-t-lg",
                children && "border-t border-slate-200",
              )}
            >
              <TableActionBar>{footerActions}</TableActionBar>
            </div>
          ) : null}
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
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
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
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
  className?: string;
}

export function FilterSelect({
  ariaLabel,
  children,
  className,
  disabled = false,
  onChange,
  value,
}: FilterSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      className={cn("sm:w-[180px]", className)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </Select>
  );
}

interface FilterComboboxProps {
  ariaLabel: string;
  disabled?: boolean;
  emptyText?: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  value: string;
  className?: string;
}

export function FilterCombobox({
  ariaLabel,
  className,
  disabled = false,
  emptyText,
  onChange,
  options,
  placeholder,
  value,
}: FilterComboboxProps) {
  return (
    <Combobox
      ariaLabel={ariaLabel}
      className={cn("w-full sm:w-[180px]", className)}
      disabled={disabled}
      emptyText={emptyText}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      value={value}
    />
  );
}

export function ToolbarControls({
  className,
  ...props
}: ComponentProps<"div">) {
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

export function ToolbarFilterGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0 [&>*]:w-full [&>button]:!w-full [&>div>button]:!w-full [&>input]:!w-full [&>select]:!w-full",
        className,
      )}
      {...props}
    />
  );
}

export function TableActionBar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center justify-end gap-2",
        className,
      )}
      {...props}
    />
  );
}

interface ListToolbarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

interface ListPageToolbarBaseProps extends Omit<
  PageToolbarProps,
  "children" | "footerActions"
> {
  /** Commands acting on the list — rendered below filters and aligned right. */
  tableActions?: ReactNode;
}

type ListPageToolbarControlProps =
  | {
      search?: undefined;
      filters?: undefined;
      onClearFilters?: never;
    }
  | {
      /** Optional search box — rendered first in the controls row. */
      search?: ListToolbarSearch;
      /** Filter controls (FilterSelect / Combobox …) — rendered after search. */
      filters: ReactNode;
      /** Required whenever list controls exist, so a reset action cannot be omitted. */
      onClearFilters: () => void;
    }
  | {
      /** Search-only list controls still require the same reset action. */
      search: ListToolbarSearch;
      filters?: ReactNode;
      onClearFilters: () => void;
    };

type ListPageToolbarProps = ListPageToolbarBaseProps &
  ListPageToolbarControlProps;

/**
 * Canonical list-page header: one shell every list page shares so search,
 * filters and count always render in the same order with identical markup.
 * Composes the existing primitives (PageToolbar → ToolbarControls →
 * SearchInput) — not a new layout, just the uniform arrangement.
 * Inherits the full PageToolbar prop surface (title/description/icon/tone/
 * actions + section props), so it stays a superset, never a narrowing.
 */
export function ListPageToolbar({
  filters,
  onClearFilters,
  search,
  tableActions,
  ...toolbarProps
}: ListPageToolbarProps) {
  const hasControls = Boolean(search || filters);
  const showClearFilters = hasControls && Boolean(onClearFilters);
  const footerActions =
    tableActions || showClearFilters ? (
      <>
        {tableActions}
        {showClearFilters && onClearFilters ? (
          <ClearFiltersButton onClear={onClearFilters} />
        ) : null}
      </>
    ) : undefined;
  return (
    <PageToolbar {...toolbarProps} footerActions={footerActions}>
      {hasControls ? (
        <div className="flex flex-col gap-3">
          {search ? (
            <ToolbarControls>
              <SearchInput
                className="sm:max-w-md"
                onChange={search.onChange}
                placeholder={search.placeholder}
                value={search.value}
              />
            </ToolbarControls>
          ) : null}
          {filters ? <ToolbarFilterGrid>{filters}</ToolbarFilterGrid> : null}
        </div>
      ) : null}
    </PageToolbar>
  );
}

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

const summaryToneClasses: Record<
  SummaryTone,
  {
    surface: string;
    iconBg: string;
    iconColor: string;
    value: string;
  }
> = {
  default: {
    surface: "bg-white",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    value: "text-slate-900",
  },
  success: {
    surface: "bg-white",
    iconBg: "bg-success-100",
    iconColor: "text-success-700",
    value: "text-success-700",
  },
  warning: {
    surface: "bg-white",
    iconBg: "bg-warning-100",
    iconColor: "text-warning-700",
    value: "text-warning-700",
  },
  danger: {
    surface: "bg-white",
    iconBg: "bg-danger-100",
    iconColor: "text-danger-700",
    value: "text-danger-700",
  },
  info: {
    surface: "bg-white",
    iconBg: "bg-brand-soft",
    iconColor: "text-primary",
    value: "text-primary",
  },
};

interface SummaryMetric {
  label: ReactNode;
  value: ReactNode;
  tone?: SummaryTone;
  icon?: LucideIcon;
  /** The one headline number in the row (usually "ทั้งหมด") reads larger than its siblings. */
  emphasis?: boolean;
  /** Turns the whole metric into one accessible filter/action target. */
  onSelect?: () => void;
  selected?: boolean;
  selectionLabel?: string;
}

/** Fixed-column layouts for callers that want an exact grid. */
const summaryColumnClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

interface SummaryMetricsProps {
  items: SummaryMetric[];
  /** Force an exact column count; otherwise cards auto-fit and fill the row. */
  columns?: keyof typeof summaryColumnClasses;
  /** Center incomplete rows while keeping the same 2/3-column card width. */
  centerRows?: boolean;
  className?: string;
}

export function SummaryMetrics({
  centerRows = false,
  className,
  columns,
  items,
}: SummaryMetricsProps) {
  // Default: cards auto-fit and stretch to fill the available width, so a row
  // with few cards never leaves an empty gap on the right and never gets cramped.
  const columnsClass = columns
    ? (summaryColumnClasses[columns] ?? summaryColumnClasses[4])
    : "[grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]";
  const centeredCardClass =
    "w-full flex-none sm:w-[calc((100%-0.875rem)/2)] lg:w-[calc((100%-1.75rem)/3)]";
  return (
    <section className={cn("w-full", className)}>
      <div
        className={cn(
          centerRows ? "flex flex-wrap justify-center gap-3.5" : "grid gap-3.5",
          !centerRows && columnsClass,
        )}
      >
        {items.map((item, index) => {
          const tone = summaryToneClasses[item.tone ?? "default"];
          const Icon = item.icon;
          const metricClassName = cn(
            "relative flex min-h-20 items-center gap-3 overflow-hidden rounded-lg border border-slate-200 px-4 py-3.5 text-left",
            centerRows && centeredCardClass,
            tone.surface,
            item.onSelect &&
              "transition-colors hover:border-primary/50 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            item.selected &&
              "border-primary bg-brand-active ring-1 ring-primary/20",
          );
          const content = (
            <>
              {Icon ? (
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    tone.iconBg,
                  )}
                >
                  <Icon
                    className={cn("size-5", tone.iconColor)}
                    aria-hidden="true"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-500">
                  {item.label}
                </div>
                <div
                  className={cn(
                    "animate-value-in font-bold leading-tight tabular-nums",
                    item.emphasis ? "text-2xl" : "text-xl",
                    tone.value,
                  )}
                  key={String(item.value)}
                >
                  {item.value}
                </div>
              </div>
            </>
          );
          return item.onSelect ? (
            <button
              aria-label={item.selectionLabel}
              aria-pressed={item.selected}
              className={metricClassName}
              data-summary-label={
                typeof item.label === "string" ? item.label : undefined
              }
              key={index}
              onClick={item.onSelect}
              type="button"
            >
              {content}
            </button>
          ) : (
            <div className={metricClassName} key={index}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ChoiceCardButtonProps extends Omit<
  ComponentProps<"button">,
  "title"
> {
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
        "rounded-lg border bg-white p-5 text-left transition-colors motion-reduce:transition-none",
        selected
          ? "border-primary bg-surface-sky"
          : "border-slate-200 hover:border-primary hover:bg-muted",
        className,
      )}
      type={type}
      {...props}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-brand-soft ring-1 ring-inset ring-black/[0.03]">
        <Icon className="size-6 text-primary" aria-hidden="true" />
      </div>
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

/** Canonical empty placeholder with quiet border-first hierarchy. */
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
        "rounded-lg border border-slate-200 bg-white px-8 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-50">
          <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
      {description ? (
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
          {description}
        </p>
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
          {description ? (
            <AlertDescription>{description}</AlertDescription>
          ) : null}
        </div>
        {onRetry ? (
          <Button
            className="shrink-0"
            onClick={onRetry}
            size="sm"
            variant="destructive"
          >
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
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white",
        className,
      )}
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
