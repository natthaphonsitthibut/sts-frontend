import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge, type BadgeProps } from "../base";
import { formatThaiDateTime, formatThaiTimeRemaining } from "../../lib/date-time";
import { cn } from "../../lib/utils";
import type { DataTableSortState } from "./data-table";

interface LinkTimeSummaryProps {
  startsAt?: string | null;
  expiresAt?: string | null;
  className?: string;
  startLabel?: string;
  variant?: "stacked" | "columns";
}

function getRemainingBadge(
  expiresAt?: string | null,
): { label: string; variant: BadgeProps["variant"] } {
  if (!expiresAt) return { label: "-", variant: "secondary" };
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return { label: "-", variant: "secondary" };
  const remainingMs = expires.getTime() - Date.now();
  if (remainingMs <= 0) return { label: "หมดอายุ", variant: "warning" };
  return {
    label: formatThaiTimeRemaining(expires),
    variant: remainingMs <= 24 * 60 * 60 * 1_000 ? "warning" : "secondary",
  };
}

export function LinkTimeSummary({
  className,
  expiresAt,
  startLabel = "เริ่ม",
  startsAt,
  variant = "stacked",
}: LinkTimeSummaryProps) {
  const remainingBadge = getRemainingBadge(expiresAt);
  const rows = [
    { label: startLabel, value: formatThaiDateTime(startsAt) },
    { label: "หมดอายุ", value: formatThaiDateTime(expiresAt) },
    { label: "อายุที่เหลือ", value: remainingBadge.label },
  ];

  if (variant === "columns") {
    return (
      <div className={cn("grid grid-cols-3 gap-2 text-xs leading-5", className)}>
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            {row.label === "อายุที่เหลือ" ? (
              <Badge
                className="min-w-[96px] justify-center whitespace-nowrap"
                variant={remainingBadge.variant}
              >
                {row.value}
              </Badge>
            ) : (
              <div className="whitespace-normal break-words font-medium tabular-nums text-slate-700">
                {row.value}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl
      className={cn(
        "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs leading-5",
        className,
      )}
    >
      {rows.map((row) => (
        <div className="contents" key={row.label}>
          <dt className="font-semibold text-slate-400">{row.label}</dt>
          <dd className="min-w-0 whitespace-normal break-words font-medium tabular-nums text-slate-600">
            {row.label === "อายุที่เหลือ" ? (
              <Badge
                className="min-w-[96px] justify-center whitespace-nowrap"
                variant={remainingBadge.variant}
              >
                {row.value}
              </Badge>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface LinkTimeHeaderProps {
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  startLabel?: string;
}

function getNextSortState(
  current: DataTableSortState | undefined,
  sortKey: string,
): DataTableSortState | undefined {
  if (current?.key !== sortKey) {
    return { key: sortKey, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { key: sortKey, direction: "desc" };
  }
  return undefined;
}

export function LinkTimeHeader({
  onSortChange,
  sort,
  startLabel = "เริ่ม",
}: LinkTimeHeaderProps) {
  const items = [
    { label: startLabel, sortKey: "starts" },
    { label: "หมดอายุ", sortKey: "expires" },
    { label: "อายุที่เหลือ", sortKey: "remaining" },
  ];

  return (
    <div className="space-y-1">
      <div className="text-center">ช่วงเวลา</div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const isActiveSort = sort?.key === item.sortKey;
          const SortIcon = isActiveSort
            ? sort?.direction === "asc"
              ? ArrowUp
              : ArrowDown
            : ArrowUpDown;
          return (
            <button
              aria-label={`เรียงตาม${item.label}`}
              className={cn(
                "inline-flex min-w-0 items-center justify-center gap-1 rounded-md text-center transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActiveSort && "text-primary",
              )}
              key={item.sortKey}
              onClick={() => onSortChange(getNextSortState(sort, item.sortKey))}
              type="button"
            >
              <span className="whitespace-normal">{item.label}</span>
              <SortIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
