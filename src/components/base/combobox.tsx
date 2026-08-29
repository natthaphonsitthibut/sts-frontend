import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";
import { Input } from "./input";

export interface ComboboxOption {
  value: string;
  label: string;
  /**
   * A second line under the label, and part of what typing searches.
   *
   * For anything whose name is not unique on its own — school names repeat
   * across the country — this is what tells two identical rows apart, and it
   * lets the list be narrowed by something the label does not contain (typing
   * a district name to reach its schools). Only the label is echoed back as
   * the chosen value, so a summary elsewhere still reads as the plain name.
   */
  description?: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  /** Optional hook for server-side narrowing while the user types. */
  onSearchChange?: (value: string) => void;
  /** When false, behaves as a plain dropdown (no typing) but keeps the styled panel. */
  searchable?: boolean;
  menuPlacement?: "bottom" | "top";
  "aria-invalid"?: boolean;
  /** Width/spacing utilities for the root wrapper — e.g. widen the trigger to fit long labels. */
  className?: string;
}

const MAX_VISIBLE = 50;

/**
 * Single-select with a consistent styled dropdown panel used across the app.
 * `searchable` (default) lets the user type to filter — best for large lists
 * (e.g. schools); set `searchable={false}` for a plain click-to-pick dropdown
 * that still shares the same panel look. Controlled via `value`/`onChange`.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "พิมพ์เพื่อค้นหา",
  emptyText = "ไม่พบรายการ",
  disabled,
  id,
  name,
  ariaLabel,
  onSearchChange,
  searchable = true,
  menuPlacement = "bottom",
  "aria-invalid": ariaInvalid,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Picking an option must leave the panel closed. The input reopens on click
  // and on focus, so any click/focus the browser still routes to it while the
  // selection is settling would otherwise pop the panel straight back open and
  // force the user to click elsewhere to dismiss it.
  const justPickedRef = useRef(false);

  function openPanel(): void {
    if (justPickedRef.current) return;
    setOpen(true);
  }

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";
  const effectiveTerm = searchable ? query.trim().toLowerCase() : "";
  const filtered = useMemo(() => {
    const matched = effectiveTerm
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ""}`
            .toLowerCase()
            .includes(effectiveTerm),
        )
      : options;
    return matched.slice(0, MAX_VISIBLE);
  }, [options, effectiveTerm]);

  useDismissable(open, containerRef, () => {
    setOpen(false);
    setQuery("");
  });

  return (
    <div
      className={cn("relative", open && "z-50", className)}
      ref={containerRef}
    >
      <Input
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "pr-10",
          !searchable && "cursor-pointer caret-transparent",
        )}
        disabled={disabled}
        id={id}
        name={name}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          if (!searchable) {
            return;
          }
          setQuery(event.target.value);
          onSearchChange?.(event.target.value);
          setOpen(true);
        }}
        // Reopen even when the field already has focus (e.g. after dismissing
        // with Escape), otherwise onFocus won't fire again and the panel feels
        // stuck — but never on the click that just picked an option.
        onClick={openPanel}
        onFocus={() => {
          if (justPickedRef.current) return;
          setQuery("");
          onSearchChange?.("");
          setOpen(true);
        }}
        placeholder={placeholder}
        readOnly={!searchable}
        value={searchable ? (open ? query : selectedLabel) : selectedLabel}
      />
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary transition-transform",
          open && "rotate-180",
          disabled && "text-slate-500",
        )}
        aria-hidden="true"
      />
      {open ? (
        <ul
          className={cn(
            "absolute z-50 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg",
            menuPlacement === "top" ? "bottom-full mb-1" : "mt-1",
          )}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-slate-50",
                    option.value === value &&
                      "bg-slate-50 font-medium text-primary",
                  )}
                  onClick={(event) => {
                    // Cancel the click's default action so a wrapping <label>
                    // can never forward it back to the input.
                    event.preventDefault();
                    justPickedRef.current = true;
                    // Release the guard once this click has fully settled, so
                    // the next genuine click on the field still opens the panel.
                    window.setTimeout(() => {
                      justPickedRef.current = false;
                    }, 0);
                    onChange(option.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  // Keep focus inside the combobox until the click selects the
                  // option; otherwise the input blur closes the panel first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  type="button"
                >
                  {option.label}
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                      {option.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
