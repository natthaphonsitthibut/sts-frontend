import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Input } from "./input";

export interface ComboboxOption {
  value: string;
  label: string;
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
  /** When false, behaves as a plain dropdown (no typing) but keeps the styled panel. */
  searchable?: boolean;
  "aria-invalid"?: boolean;
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
  searchable = true,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const effectiveTerm = searchable ? query.trim().toLowerCase() : "";
  const filtered = useMemo(() => {
    const matched = effectiveTerm
      ? options.filter((option) => option.label.toLowerCase().includes(effectiveTerm))
      : options;
    return matched.slice(0, MAX_VISIBLE);
  }, [options, effectiveTerm]);

  return (
    <div className="relative">
      <Input
        aria-invalid={ariaInvalid}
        className={cn("pr-10", !searchable && "cursor-pointer caret-transparent")}
        disabled={disabled}
        id={id}
        name={name}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          if (!searchable) {
            return;
          }
          setQuery(event.target.value);
          setOpen(true);
        }}
        // Reopen even when the field already has focus (e.g. right after a pick),
        // otherwise onFocus won't fire again and the panel feels stuck.
        onClick={() => setOpen(true)}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder}
        readOnly={!searchable}
        value={searchable ? (open ? query : selectedLabel) : selectedLabel}
      />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-slate-50",
                    option.value === value && "bg-slate-50 font-medium text-primary",
                  )}
                  // mousedown fires before the input's blur, so the pick registers
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
