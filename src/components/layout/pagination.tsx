import { ChevronLeft, ChevronRight } from "lucide-react";
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

function buildPageWindow(current: number, total: number): number[] {
  const maxButtons = 6;
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
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
  const pageWindow = buildPageWindow(page, totalPages);

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
            aria-label="หน้าก่อนหน้า"
            className="flex size-9 items-center justify-center rounded-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {pageWindow.map((pageNumber) => (
            <button
              key={pageNumber}
              aria-current={pageNumber === page ? "page" : undefined}
              className={cn(
                "min-h-9 min-w-9 rounded-lg px-2 font-bold transition-colors",
                pageNumber === page
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
              onClick={() => onPageChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
          <button
            aria-label="หน้าถัดไป"
            className="flex size-9 items-center justify-center rounded-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
