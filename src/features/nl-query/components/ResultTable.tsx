import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { formatValue, humanizeHeader, isRightAligned } from "../lib/format";
import type { QueryColumn } from "../types/nl-query.types";

interface ResultTableProps {
  rows: Record<string, unknown>[];
  columns: QueryColumn[];
}

type SortState = { name: string; direction: "ascending" | "descending" } | null;

export function ResultTable({ columns, rows }: ResultTableProps) {
  const [sort, setSort] = useState<SortState>(null);
  const view = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.name === sort.name);
    if (!column) return rows;
    const multiplier = sort.direction === "ascending" ? 1 : -1;

    return [...rows].sort((left, right) => {
      const a = left[column.name];
      const b = right[column.name];
      if ((a === null || a === undefined) && (b === null || b === undefined)) {
        return 0;
      }
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      const comparison = column.numeric
        ? Number(a) - Number(b)
        : String(a).localeCompare(String(b), "th");
      return comparison * multiplier;
    });
  }, [columns, rows, sort]);

  function toggleSort(name: string): void {
    setSort((current) => ({
      name,
      direction:
        current?.name === name && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  return (
    <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e5e5e5]">
          <tr>
            {columns.map((column) => {
              const active = sort?.name === column.name;
              const Icon = !active
                ? ChevronsUpDown
                : sort.direction === "ascending"
                  ? ArrowUp
                  : ArrowDown;
              return (
                <th
                  aria-sort={active ? sort.direction : "none"}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 font-semibold text-slate-700",
                    isRightAligned(column) && "text-right",
                  )}
                  key={column.name}
                >
                  <button
                    className={cn(
                      "inline-flex items-center gap-1 rounded text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isRightAligned(column) && "flex-row-reverse",
                    )}
                    onClick={() => toggleSort(column.name)}
                    type="button"
                  >
                    {humanizeHeader(column.name)}
                    <Icon className="size-3.5" aria-hidden="true" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {view.map((row, rowIndex) => (
            <tr className="hover:bg-slate-50" key={rowIndex}>
              {columns.map((column) => (
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-slate-700",
                    isRightAligned(column) && "text-right tabular-nums",
                  )}
                  key={column.name}
                >
                  {formatValue(row[column.name], column.semantic_type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
