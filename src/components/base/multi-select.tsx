import { useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";
import type { ComboboxOption } from "./combobox";

export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ComboboxOption[];
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Chip-style multi picker used where one row owns several references — e.g. the
 * classrooms a teacher covers for a subject. Selected values stay visible as
 * removable chips so a long selection never hides behind a summary count.
 */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "ไม่พบตัวเลือก",
  disabled = false,
  id,
  ariaLabel,
  className,
}: MultiSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedListId = useId();
  const listId = `${id ?? generatedListId}-listbox`;
  const [open, setOpen] = useState(false);
  useDismissable(open, containerRef, () => setOpen(false));

  const selected = options.filter((option) => value.includes(option.value));

  function toggle(optionValue: string): void {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  }

  function focusOption(edge: "first" | "last"): void {
    requestAnimationFrame(() => {
      const optionButtons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      optionButtons?.[edge === "first" ? 0 : optionButtons.length - 1]?.focus();
    });
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 pr-10 text-left text-sm font-medium text-slate-800 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-500",
        )}
      >
        {selected.map((option) => (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
            key={option.value}
          >
            {option.label}
            <button
              aria-label={`นำ ${option.label} ออก`}
              className="relative inline-flex size-7 items-center justify-center rounded-sm text-slate-500 transition-colors before:absolute before:-inset-2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              disabled={disabled}
              onClick={() => toggle(option.value)}
              type="button"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <button
          aria-controls={listId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel ?? placeholder}
          className="min-h-6 min-w-24 flex-1 text-left outline-none"
          disabled={disabled}
          id={id}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            setOpen(true);
            focusOption(event.key === "ArrowDown" ? "first" : "last");
          }}
          ref={triggerRef}
          type="button"
        >
          {selected.length === 0 ? (
            <span className="text-slate-500">{placeholder}</span>
          ) : (
            <span aria-hidden="true" className="sr-only">
              เปิดรายการตัวเลือก
            </span>
          )}
        </button>
      </div>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 top-3 size-4 text-primary transition-transform",
          open && "rotate-180",
          disabled && "text-slate-500",
        )}
      />

      {open && !disabled ? (
        <ul
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          id={listId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const optionButtons = Array.from(
              listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
            );
            if (optionButtons.length === 0) return;
            if (event.key === "Home" || event.key === "End") {
              optionButtons[event.key === "Home" ? 0 : optionButtons.length - 1]?.focus();
              return;
            }
            const current = optionButtons.indexOf(document.activeElement as HTMLButtonElement);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            optionButtons[(current + direction + optionButtons.length) % optionButtons.length]?.focus();
          }}
          ref={listRef}
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <li key={option.value} role="presentation">
                  <button
                    aria-selected={isSelected}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                      isSelected && "bg-slate-50 font-medium text-primary",
                    )}
                    onClick={() => toggle(option.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      toggle(option.value);
                    }}
                    role="option"
                    type="button"
                  >
                    {option.label}
                    {isSelected ? (
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
