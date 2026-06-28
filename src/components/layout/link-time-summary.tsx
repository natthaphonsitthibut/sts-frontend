import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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

export function LinkTimeSummary({
  className,
  expiresAt,
  startLabel = "เริ่ม",
  startsAt,
  variant = "stacked",
}: LinkTimeSummaryProps) {
  const rows = [
    { label: startLabel, value: formatThaiDateTime(startsAt) },
    { label: "หมดอายุ", value: formatThaiDateTime(expiresAt) },
    { label: "อายุที่เหลือ", value: formatThaiTimeRemaining(expiresAt) },
  ];

  if (variant === "columns") {
    return (
      <div className={cn("grid grid-cols-3 gap-3 text-xs leading-5", className)}>
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            <div className="truncate font-medium tabular-nums text-slate-700">
              {row.value}
            </div>
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
          <dd className="min-w-0 truncate font-medium tabular-nums text-slate-600">
            {row.value}
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
      <div className="grid grid-cols-3 gap-3">
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
              <span className="truncate">{item.label}</span>
              <SortIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
