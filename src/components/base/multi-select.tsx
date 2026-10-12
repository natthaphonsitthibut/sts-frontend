import { OverlayPortal } from "./overlay-portal";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useAnchoredPanelPosition } from "../../hooks/useAnchoredPanelPosition";
import { useDismissable } from "../../hooks/useDismissable";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import type { ComboboxOption } from "./combobox";
import { IconButton } from "./icon-button";
import { Input } from "./input";
import { Dialog, DialogContent } from "./dialog";

/** Same cap as `Combobox`: a long list stays scrollable, not endless. */
const MAX_VISIBLE = 50;
/** Five rows of choices plus the footer that keeps the count and เสร็จ in view. */
const PANEL_MAX_HEIGHT = 232 + 50;
/**
 * A handful of fixed choices is read, not searched. Below this the field is a
 * plain tap target, so a phone does not raise its keyboard over the choices.
 */
const SEARCH_THRESHOLD = 8;
/** Below Tailwind's `sm`: the choices open as a bottom sheet. */
const COMPACT_QUERY = "(max-width: 639px)";

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
 *
 * Every row carries a tick box and the panel keeps a count with เสร็จ in view,
 * so it reads as "pick several" rather than a one-choice dropdown. On a phone
 * the choices open as a bottom sheet instead of a list under the keyboard.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetDoneRef = useRef<HTMLButtonElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // Drag-to-pan for the single-row field: a trackpad swipe is not available to
  // everyone, so the chips can also be pulled sideways with the pointer.
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScroll: 0,
  });
  const generatedListId = useId();
  const listId = `${id ?? generatedListId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const compact = useMediaQuery(COMPACT_QUERY);
  const searchable = options.length > SEARCH_THRESHOLD;
  // On a phone the search box lives in the sheet, so the field never types.
  const typesInField = searchable && !compact;
  useDismissable(open && !compact, [containerRef, panelRef], (reason) => {
    setOpen(false);
    setQuery("");
    if (reason === "escape") triggerRef.current?.focus();
  });

  // Portal + viewport coordinates escape the Dialog's scroll box.
  const listStyle = useAnchoredPanelPosition(
    open && !disabled && !compact,
    containerRef,
    PANEL_MAX_HEIGHT,
    [value.length],
  );

  const sheetOpen = open && !disabled && compact;
  useEffect(() => {
    if (!open || compact) return;
    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      if (
        active !== document.body &&
        !containerRef.current?.contains(active) &&
        !panelRef.current?.contains(active)
      )
        return;
      // A press on panel text can leave focus on body. Handle Escape before
      // the parent dialog's document listener so only this picker closes.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
    }
    function dismissAfterFocusLeaves(event: FocusEvent): void {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("focusin", dismissAfterFocusLeaves);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("focusin", dismissAfterFocusLeaves);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open, compact]);
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  const selected = options.filter((option) => value.includes(option.value));
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const matched = term
      ? options.filter((option) => option.label.toLowerCase().includes(term))
      : options;
    return matched.slice(0, MAX_VISIBLE);
  }, [options, term]);

  function toggle(optionValue: string, returnToSearch = typesInField): void {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
    // Clear the term but keep the panel open: picking several people in a row
    // is the normal case, and each one starts from a fresh search.
    setQuery("");
    if (returnToSearch) triggerRef.current?.focus();
  }

  function close(): void {
    setOpen(false);
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
      const optionButtons =
        listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      optionButtons?.[edge === "first" ? 0 : optionButtons.length - 1]?.focus();
    });
  }

  const heading = ariaLabel ?? placeholder;
  const summary =
    value.length > 0
      ? `เลือกแล้ว ${value.length} รายการ`
      : "เลือกได้หลายรายการ";

  const list = (
    <ul
      aria-multiselectable="true"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      id={listId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const optionButtons = Array.from(
          listRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="option"]',
          ) ?? [],
        );
        if (optionButtons.length === 0) return;
        if (event.key === "Home" || event.key === "End") {
          optionButtons[
            event.key === "Home" ? 0 : optionButtons.length - 1
          ]?.focus();
          return;
        }
        const current = optionButtons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const direction = event.key === "ArrowDown" ? 1 : -1;
        optionButtons[
          (current + direction + optionButtons.length) % optionButtons.length
        ]?.focus();
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
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none",
                  compact ? "min-h-12 px-4" : "min-h-11",
                  isSelected && "bg-primary-soft font-medium text-primary-dark",
                )}
                onClick={(event) =>
                  toggle(option.value, event.detail > 0 && !compact)
                }
                role="option"
                type="button"
              >
                {/* Drawn like `Checkbox` so every row reads as "tick as many
                    as apply" before anything is picked; the option button
                    itself stays the one control. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white",
                  )}
                >
                  {isSelected ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">{option.label}</span>
              </button>
            </li>
          );
        })
      )}
    </ul>
  );

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
          singleRow &&
            selected.length > 0 &&
            "cursor-grab active:cursor-grabbing",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-500",
        )}
        // The whole field opens the list, not just the sliver of text input
        // between the chips: the chevron is decorative and the padding it sits
        // in was dead space, so the control looked pressable in places that
        // did nothing.
        onClick={(event) => {
          if (disabled) return;
          // A chip's remove button owns its own click; opening the list on top
          // of removing is a second action nobody asked for.
          if ((event.target as HTMLElement).closest("button")) return;
          setOpen(true);
          triggerRef.current?.focus();
        }}
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
              onClick={() => {
                toggle(option.value);
                triggerRef.current?.focus();
              }}
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
          className={cn(
            "min-h-6 min-w-24 flex-1 bg-transparent text-left outline-none placeholder:text-slate-500 disabled:cursor-not-allowed",
            !typesInField && "cursor-pointer caret-transparent",
            // Nothing is typed here, so beside chips it only needs to hold
            // focus — at full width it wrapped onto an empty second row.
            !typesInField && selected.length > 0 && "w-px min-w-0 flex-none",
          )}
          disabled={disabled}
          id={id}
          inputMode={typesInField ? undefined : "none"}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setQuery("");
              return;
            }
            const opensWithKey =
              !typesInField && (event.key === "Enter" || event.key === " ");
            if (
              event.key !== "ArrowDown" &&
              event.key !== "ArrowUp" &&
              !opensWithKey
            )
              return;
            event.preventDefault();
            setOpen(true);
            if (!compact)
              focusOption(event.key === "ArrowUp" ? "last" : "first");
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          readOnly={!typesInField}
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

      {open && !disabled && !compact && listStyle ? (
        <OverlayPortal>
          <div
            className="fixed z-[60] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              close();
            }}
            ref={panelRef}
            style={listStyle}
          >
            {list}
            <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
                {summary}
              </p>
              {value.length > 0 ? (
                <Button
                  onClick={() => {
                    onChange([]);
                    // Clear disappears with the last pick; leave focus on a
                    // mounted control so Escape can dismiss only this panel.
                    triggerRef.current?.focus();
                  }}
                  size="sm"
                  variant="outline"
                >
                  ล้าง
                </Button>
              ) : null}
              <Button onClick={close} size="sm">
                เสร็จ
              </Button>
            </div>
          </div>
        </OverlayPortal>
      ) : null}

      {sheetOpen ? (
        <OverlayPortal>
          <Dialog
            className="z-[60] items-end p-0"
            onOpenChange={(nextOpen) => {
              if (!nextOpen) close();
            }}
            open
          >
            <DialogContent
              aria-label={heading}
              className="flex max-h-[80dvh] max-w-none animate-sheet-in-bottom flex-col overflow-hidden rounded-none rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] shadow-xl"
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {heading}
                  </p>
                  <p className="text-xs font-medium text-slate-600">
                    {summary}
                  </p>
                </div>
                <IconButton aria-label="ปิด" icon={X} onClick={close} />
              </div>
              {searchable ? (
                <div className="shrink-0 border-b border-slate-200 px-4 py-2">
                  <Input
                    aria-label={`ค้นหา${heading}`}
                    autoComplete="off"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหา"
                    value={query}
                  />
                </div>
              ) : null}
              {list}
              <div className="flex shrink-0 gap-2 border-t border-slate-200 p-3">
                <Button
                  disabled={value.length === 0}
                  fullWidth
                  onClick={() => {
                    onChange([]);
                    sheetDoneRef.current?.focus();
                  }}
                  variant="outline"
                >
                  ล้าง
                </Button>
                <Button fullWidth onClick={close} ref={sheetDoneRef}>
                  เสร็จ
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
