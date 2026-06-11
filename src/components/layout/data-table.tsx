import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Central data-table primitives.
 * Every list table in the app shares one shell, header and row treatment so
 * borders, radius, density, typography and hover stay identical system-wide.
 * Desktop renders a bordered table; mobile is expected to render `TableCardList`.
 */

interface DataTableProps {
  /** Column headings; empty string renders a spacer cell (e.g. an actions column). */
  headings: ReactNode[];
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
  /** `<tr>` rows for the table body. */
  children: ReactNode;
  /** Extra content rendered after the table inside the shell (e.g. empty state). */
  footer?: ReactNode;
  className?: string;
}

export function DataTable({
  children,
  className,
  columnWidths,
  footer,
  headings,
  minWidthClassName = "min-w-[820px]",
  responsive = true,
}: DataTableProps) {
  const fixedLayout = Boolean(columnWidths);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card",
        responsive && "hidden md:block",
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
          <thead>
            <tr className="bg-muted">
              {headings.map((heading, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500",
                    columnWidths?.[index],
                  )}
                >
                  {heading}
                </th>
              ))}
            </tr>
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
  return <td className={cn("px-4 py-4 align-middle", className)} {...props} />;
}

/** Mobile counterpart wrapper — a vertical stack shown only below `md`. */
export function TableCardList({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-3 md:hidden", className)} {...props} />
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
