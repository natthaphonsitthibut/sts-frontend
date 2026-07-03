import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Central data-table primitives.
 * Every list table in the app shares one shell, header and row treatment so
 * borders, radius, density, typography and hover stay identical system-wide.
 * Desktop renders a bordered table; mobile is expected to render `TableCardList`.
 */

export type DataTableSortDirection = "asc" | "desc";

export interface DataTableSortState {
  key: string;
  direction: DataTableSortDirection;
}

export interface DataTableHeading {
  label: ReactNode;
  sortKey?: string;
  ariaLabel?: string;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}

type DataTableHeadingInput = ReactNode | DataTableHeading;

interface DataTableProps {
  /** Column headings; empty string renders a spacer cell (e.g. an actions column). */
  headings: DataTableHeadingInput[];
  headingRows?: DataTableHeadingInput[][];
  sort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState | undefined) => void;
  /**
   * Per-column Tailwind width classes (e.g. `["w-[22%]", "w-[14%]"]`). When provided,
   * the table switches to a fixed layout so changing cell content (status badges,
   * conditional action buttons) never reflows the other columns. Length should match
   * `headings`; entries may be empty strings for "auto".
   */
  columnWidths?: string[];
  /** Tailwind min-width keeping columns readable before horizontal scroll. */
  minWidthClassName?: string;
  /**
   * When true (default) the table is hidden below `md` so a paired `TableCardList`
   * can take over. Set false for tables that have no mobile-card counterpart and
   * should stay scrollable on every breakpoint.
   */
  responsive?: boolean;
  /** Breakpoint where the desktop table replaces its paired card list. */
  responsiveBreakpoint?: "md" | "lg";
  /** `<tr>` rows for the table body. */
  children: ReactNode;
  /** Extra content rendered after the table inside the shell (e.g. empty state). */
  footer?: ReactNode;
  className?: string;
}

function isHeadingConfig(heading: DataTableHeadingInput): heading is DataTableHeading {
  return (
    typeof heading === "object" &&
    heading !== null &&
    !isValidElement(heading) &&
    "label" in heading
  );
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

export function DataTable({
  children,
  className,
  columnWidths,
  footer,
  headings,
  headingRows,
  minWidthClassName = "min-w-[820px]",
  onSortChange,
  responsive = true,
  responsiveBreakpoint = "md",
  sort,
}: DataTableProps) {
  const fixedLayout = Boolean(columnWidths);
  const rows = headingRows ?? [headings];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card",
        responsive &&
          (responsiveBreakpoint === "lg" ? "hidden lg:block" : "hidden md:block"),
        className,
      )}
    >
      <div className="overflow-auto">
        <table
          className={cn(
            "w-full border-collapse text-left",
            fixedLayout && "table-fixed",
            minWidthClassName,
          )}
        >
          {columnWidths ? (
            <colgroup>
              {columnWidths.map((width, index) => (
                <col className={width} key={index} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            {rows.map((headingRow, rowIndex) => (
              <tr className="bg-muted" key={rowIndex}>
                {headingRow.map((heading, index) => {
                  const config = isHeadingConfig(heading)
                    ? heading
                    : { label: heading };
                  const sortKey = config.sortKey;
                  const isSortable = Boolean(sortKey && onSortChange);
                  const isActiveSort = Boolean(
                    sortKey && sort?.key === sortKey,
                  );
                  const SortIcon = isActiveSort
                    ? sort?.direction === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;

                  return (
                    <th
                      key={index}
                      colSpan={config.colSpan}
                      rowSpan={config.rowSpan}
                      aria-sort={
                        isActiveSort
                          ? sort?.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={cn(
                        "px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500",
                        !headingRows && columnWidths?.[index],
                        config.className,
                      )}
                    >
                      {isSortable && sortKey && onSortChange ? (
                        <button
                          type="button"
                          aria-label={config.ariaLabel}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md text-left transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            isActiveSort && "text-primary",
                          )}
                          onClick={() => onSortChange(getNextSortState(sort, sortKey))}
                        >
                          <span>{config.label}</span>
                          <SortIcon className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        config.label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

/** A body row with the shared divider + hover treatment. */
export function DataTableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-t border-slate-100 transition-colors hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/** A body cell with the shared padding. */
export function DataTableCell({ className, ...props }: ComponentProps<"td">) {
  // Fixed row height (content vertically centered) so every row in every table
  // is the same height regardless of 1-line vs 2-line cell content.
  return (
    <td
      className={cn("h-[68px] px-4 align-middle text-sm text-slate-600", className)}
      {...props}
    />
  );
}

/** Mobile counterpart wrapper — a vertical stack shown only below `md`. */
interface TableCardListProps extends ComponentProps<"div"> {
  desktopBreakpoint?: "md" | "lg";
}

export function TableCardList({
  className,
  desktopBreakpoint = "md",
  ...props
}: TableCardListProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        desktopBreakpoint === "lg" ? "lg:hidden" : "md:hidden",
        className,
      )}
      {...props}
    />
  );
}

interface TableCardProps extends ComponentProps<"div"> {
  /** Render as a focusable button when the whole card is a click target. */
  interactive?: boolean;
}

/** A single mobile card mirroring one table row. */
export function TableCard({ className, interactive, ...props }: TableCardProps) {
  const classes = cn(
    "rounded-lg border border-slate-200 bg-white p-5 shadow-card",
    className,
  );
  if (interactive) {
    return (
      <button
        type="button"
        className={cn(classes, "w-full text-left")}
        {...(props as ComponentProps<"button">)}
      />
    );
  }
  return <div className={classes} {...props} />;
}
