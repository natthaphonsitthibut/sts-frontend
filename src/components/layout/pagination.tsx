import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { NumericInput, Select } from "../base";
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

const fullNumberFormatter = new Intl.NumberFormat("en-US");

function formatFullNumber(value: number): string {
  return fullNumberFormatter.format(value);
}

function formatCompactPageNumber(value: number): string {
  const units = [
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];
  const unit = units.find((candidate) => value >= candidate.value);
  if (!unit) return String(value);

  const scaled = value / unit.value;
  const fractionDigits = scaled < 10 && !Number.isInteger(scaled) ? 1 : 0;
  return `${scaled.toFixed(fractionDigits).replace(/\.0$/, "")}${unit.suffix}`;
}

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

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(page, 1), totalPages);
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
  const [goToPageDraft, setGoToPageDraft] = useState({
    page,
    value: String(page),
  });
  const start = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);
  const pageItems = buildPageItems(page, totalPages);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  const goToPageValue =
    goToPageDraft.page === page ? goToPageDraft.value : String(page);
  const totalPageDigits = String(totalPages).length;
  const pageNumberWidthClass = totalPages >= 1_000 ? "w-12" : "w-9";
  const summaryWidthCh = Math.min(
    Math.max(String(totalCount || 0).length * 3 + unitLabel.length + 16, 28),
    54,
  );
  const goToInputWidthCh = Math.min(Math.max(totalPageDigits + 3, 6), 12);
  const totalPagesLabelWidthCh = Math.min(Math.max(totalPageDigits + 2, 4), 14);

  function submitGoToPage(): void {
    const nextPage = clampPage(Number(goToPageValue), totalPages);
    setGoToPageDraft({ page: nextPage, value: String(nextPage) });
    if (nextPage !== page) {
      onPageChange(nextPage);
    }
  }

  function handleGoToKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      submitGoToPage();
    }
  }

  const navButtonClass =
    "flex size-9 items-center justify-center rounded-full bg-white font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div
        className="font-mono text-sm font-bold tabular-nums text-slate-900"
        style={{ minWidth: `min(${summaryWidthCh}ch, 100%)` }}
      >
        แสดง {formatFullNumber(start)}-{formatFullNumber(end)} จาก{" "}
        {formatFullNumber(totalCount)} {unitLabel}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="inline-flex items-center gap-2.5 text-sm font-bold text-slate-600">
          <span>ต่อหน้า</span>
          <Select
            aria-label="จำนวนรายการต่อหน้า"
            className="h-10 w-[124px] rounded-full border-slate-200 bg-white py-0 pl-4 pr-9 font-bold leading-none shadow-none"
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            value={rowsPerPage}
          >
            {rowsPerPageOptions.map((size) => (
              <option key={size} value={size}>
                {size} / หน้า
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
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
                className={cn(
                  "flex size-9 items-center justify-center font-bold text-slate-400",
                  pageNumberWidthClass,
                )}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                aria-current={item === page ? "page" : undefined}
                aria-label={`หน้า ${formatFullNumber(item)}`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full font-mono text-sm font-bold tabular-nums transition-colors",
                  pageNumberWidthClass,
                  item === page
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-slate-600 hover:bg-white hover:shadow-sm",
                )}
                onClick={() => onPageChange(item)}
                title={`หน้า ${formatFullNumber(item)}`}
                type="button"
              >
                {formatCompactPageNumber(item)}
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

        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <span>ไปหน้า</span>
          <NumericInput
            aria-label="ไปยังหน้าที่"
            className="h-9 rounded-full text-center font-mono font-bold tabular-nums"
            max={totalPages}
            min={1}
            onBlur={submitGoToPage}
            onChange={(event) =>
              setGoToPageDraft({ page, value: event.target.value })
            }
            onKeyDown={handleGoToKeyDown}
            style={{ width: `${goToInputWidthCh}ch` }}
            value={goToPageValue}
          />
          <span
            className="font-mono tabular-nums text-slate-400"
            style={{ minWidth: `${totalPagesLabelWidthCh}ch` }}
          >
            / {formatFullNumber(totalPages)}
          </span>
        </label>
      </div>
    </div>
  );
}
