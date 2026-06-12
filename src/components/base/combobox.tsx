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
  "aria-invalid"?: boolean;
}

const MAX_VISIBLE = 50;

/**
 * Searchable single-select: type to filter, click to pick. Use instead of a
 * native Select when the option list is large (e.g. schools), where scrolling a
 * plain dropdown is impractical. Selection is controlled via `value`/`onChange`.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "พิมพ์เพื่อค้นหา",
  emptyText = "ไม่พบรายการ",
  disabled,
  id,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const matched = term
      ? options.filter((option) => option.label.toLowerCase().includes(term))
      : options;
    return matched.slice(0, MAX_VISIBLE);
  }, [options, term]);

  return (
    <div className="relative">
      <Input
        aria-invalid={ariaInvalid}
        className="pr-10"
        disabled={disabled}
        id={id}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder}
        value={open ? query : selectedLabel}
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
