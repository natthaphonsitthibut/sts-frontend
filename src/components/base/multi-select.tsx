import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";
import type { ComboboxOption } from "./combobox";

/** Same cap as `Combobox`: a long list stays scrollable, not endless. */
const MAX_VISIBLE = 50;

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
  /**
   * Keeps the field one row tall and scrolls the chips sideways instead of
   * wrapping. Use it where the field shares a row with other inputs — a field
   * that grows with every pick shifts everything around it.
   */
  singleRow?: boolean;
}

/**
 * Chip-style multi picker used where one row owns several references — e.g. the
 * teachers and classrooms a subject is taught by. Selected values stay visible
 * as removable chips so a long selection never hides behind a summary count,
 * and typing filters the list the way `Combobox` does: a school's teacher list
 * is far too long to find a name by scrolling.
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
  singleRow = false,
}: MultiSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // Drag-to-pan for the single-row field: a trackpad swipe is not available to
  // everyone, so the chips can also be pulled sideways with the pointer.
  const dragRef = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
  const generatedListId = useId();
  const listId = `${id ?? generatedListId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useDismissable(open, containerRef, () => {
    setOpen(false);
    setQuery("");
  });

  const selected = options.filter((option) => value.includes(option.value));
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const matched = term
      ? options.filter((option) => option.label.toLowerCase().includes(term))
      : options;
    return matched.slice(0, MAX_VISIBLE);
  }, [options, term]);

  function toggle(optionValue: string): void {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
    // Clear the term but keep the panel open: picking several people in a row
    // is the normal case, and each one starts from a fresh search.
    setQuery("");
    triggerRef.current?.focus();
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>): void {
    const chips = chipsRef.current;
    if (!singleRow || !chips || chips.scrollWidth <= chips.clientWidth) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startScroll: chips.scrollLeft,
    };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>): void {
    const chips = chipsRef.current;
    if (!dragRef.current.active || !chips) return;
    const travelled = event.clientX - dragRef.current.startX;
    if (Math.abs(travelled) > 3) dragRef.current.moved = true;
    chips.scrollLeft = dragRef.current.startScroll - travelled;
  }

  function endDrag(): void {
    dragRef.current.active = false;
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
          // `min-h-10` matches `Input`, `DatePicker` and `TimePicker` so an
          // empty picker lines up with every other control on the row.
          "flex min-h-10 w-full items-center gap-1.5 scroll-px-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 pr-11 text-left text-sm font-medium text-slate-800 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          // Wrapping stops at two rows and then scrolls; without a ceiling the
          // field keeps growing and drags the rest of the form with it.
          singleRow
            ? "h-10 flex-nowrap overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "max-h-[4.75rem] flex-wrap overflow-y-auto",
          singleRow && selected.length > 0 && "cursor-grab active:cursor-grabbing",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-500",
        )}
        onClickCapture={(event) => {
          // A pan that ended on a chip must not also remove it.
          if (!dragRef.current.moved) return;
          dragRef.current.moved = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={startDrag}
        onPointerLeave={endDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        ref={chipsRef}
      >
        {selected.map((option) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700",
              singleRow && "shrink-0 whitespace-nowrap",
            )}
            key={option.value}
          >
            {option.label}
            <button
              aria-label={`นำ ${option.label} ออก`}
              className="relative inline-flex size-5 items-center justify-center rounded-sm text-slate-500 transition-colors before:absolute before:-inset-2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              disabled={disabled}
              onClick={() => toggle(option.value)}
              type="button"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          aria-controls={listId}
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          autoComplete="off"
          className="min-h-6 min-w-24 flex-1 bg-transparent text-left outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
          disabled={disabled}
          id={id}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setQuery("");
              return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            setOpen(true);
            focusOption(event.key === "ArrowDown" ? "first" : "last");
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          ref={triggerRef}
          role="combobox"
          type="text"
          value={query}
        />
      </div>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 size-4 text-primary transition-transform",
          singleRow ? "top-1/2 -translate-y-1/2" : "top-3",
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
              setQuery("");
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
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {options.length === 0 ? emptyText : "ไม่พบรายการที่ค้นหา"}
            </li>
          ) : (
            filtered.map((option) => {
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
