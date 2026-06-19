import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Select } from "../base";
import { cn } from "../../lib/utils";

interface PaginationProps {
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  /** Noun used in the "showing X–Y of Z" summary. */
  unitLabel?: string;
}

type PageItem = number | "ellipsis";

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return length > 0 ? Array.from({ length }, (_, index) => start + index) : [];
}

/**
 * Build the page row: always show the first and last page, a window of siblings
 * around the current page, and collapse the remaining gaps into an ellipsis
 * (e.g. `1 2 3 4 5 … 22`). A gap of a single page is shown as that page number
 * rather than an ellipsis.
 */
function buildPageItems(current: number, total: number): PageItem[] {
  const boundaryCount = 1;
  const siblingCount = 1;
  // first + last + current + 2 siblings + 2 boundaries + 2 ellipsis slots
  const minForEllipsis = boundaryCount * 2 + siblingCount * 2 + 3;

  if (total <= minForEllipsis) {
    return range(1, total);
  }

  const startPages = range(1, boundaryCount);
  const endPages = range(total - boundaryCount + 1, total);

  const siblingsStart = Math.max(
    Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : total - 1,
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? (["ellipsis"] as PageItem[])
      : boundaryCount + 1 < total - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < total - boundaryCount - 1
      ? (["ellipsis"] as PageItem[])
      : total - boundaryCount > boundaryCount
        ? [total - boundaryCount]
        : []),
    ...endPages,
  ];
}

/** Central pagination control — page window, prev/next and rows-per-page select. */
export function Pagination({
  onPageChange,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions,
  totalCount,
  unitLabel = "รายการ",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const start = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);
  const pageItems = buildPageItems(page, totalPages);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  const navButtonClass =
    "flex size-9 items-center justify-center rounded-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="text-sm font-bold text-slate-900">
        แสดง {start}-{end} จาก {totalCount} {unitLabel}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="inline-flex items-center gap-2.5 text-sm font-bold text-slate-600">
          <span>ต่อหน้า</span>
          <Select
            aria-label="จำนวนรายการต่อหน้า"
            className="h-9 w-[88px]"
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            value={rowsPerPage}
          >
            {rowsPerPageOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <button
            aria-label="หน้าแรก"
            className={navButtonClass}
            disabled={isFirstPage}
            onClick={() => onPageChange(1)}
            type="button"
          >
            <ChevronFirst className="size-4" aria-hidden="true" />
          </button>
          <button
            aria-label="หน้าก่อนหน้า"
            className={navButtonClass}
            disabled={isFirstPage}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="flex min-h-9 min-w-9 items-center justify-center px-1 font-bold text-slate-400"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                aria-current={item === page ? "page" : undefined}
                aria-label={`หน้า ${item}`}
                className={cn(
                  "min-h-9 min-w-9 rounded-lg px-2 font-bold transition-colors",
                  item === page
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100",
                )}
                onClick={() => onPageChange(item)}
                type="button"
              >
                {item}
              </button>
            ),
          )}
          <button
            aria-label="หน้าถัดไป"
            className={navButtonClass}
            disabled={isLastPage}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <button
            aria-label="หน้าสุดท้าย"
            className={navButtonClass}
            disabled={isLastPage}
            onClick={() => onPageChange(totalPages)}
            type="button"
          >
            <ChevronLast className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
