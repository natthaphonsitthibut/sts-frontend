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
    { label: "หมด", value: formatThaiDateTime(expiresAt) },
    { label: "อายุที่เหลือ", value: remainingBadge.label },
  ];

  if (variant === "columns") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 text-xs leading-5",
          className,
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex gap-1 font-medium tabular-nums text-slate-700">
            <span className="w-8 shrink-0 font-semibold text-slate-500">{startLabel}</span>
            <span className="min-w-0 break-words">{rows[0].value}</span>
          </div>
          <div className="flex gap-1 font-medium tabular-nums text-slate-700">
            <span className="w-8 shrink-0 font-semibold text-slate-500">หมด</span>
            <span className="min-w-0 break-words">{rows[1].value}</span>
          </div>
        </div>
        <Badge
          className="min-w-[96px] shrink-0 justify-center whitespace-nowrap px-2.5"
          variant={remainingBadge.variant}
        >
          {remainingBadge.label}
        </Badge>
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
          <dt className="font-semibold text-slate-500">{row.label}</dt>
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
    { label: "หมด", sortKey: "expires" },
    { label: "อายุที่เหลือ", sortKey: "remaining" },
  ];

  const renderSortButton = (
    item: { label: string; sortKey: string },
    extraClassName?: string,
  ) => {
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
          "inline-flex min-w-0 items-center gap-1 rounded-md text-left transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isActiveSort && "text-primary",
          extraClassName,
        )}
        key={item.sortKey}
        onClick={() => onSortChange(getNextSortState(sort, item.sortKey))}
        type="button"
      >
        <span className="whitespace-nowrap">{item.label}</span>
        <SortIcon className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  };

  const [startItem, expireItem, remainingItem] = items;

  return (
    <div className="space-y-1">
      <div className="text-center">ช่วงเวลา</div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          {renderSortButton(startItem)}
          {renderSortButton(expireItem)}
        </div>
        {renderSortButton(remainingItem, "min-w-[96px] shrink-0 justify-center")}
      </div>
    </div>
  );
}
