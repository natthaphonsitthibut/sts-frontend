import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { OverlayPortal } from "./overlay-portal";
import type { LucideIcon } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";

export interface DropdownMenuItem {
  /** Stable key; also used as the fallback accessible name source. */
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Renders the item in the destructive palette (revoke, delete, …). */
  destructive?: boolean;
}

export interface DropdownMenuProps {
  /** The button that opens the menu. Receives the props it must spread. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
  }) => ReactNode;
  items: DropdownMenuItem[];
  /** Accessible name of the menu surface itself. */
  ariaLabel: string;
  align?: "start" | "end";
  className?: string;
  /** Optional block rendered above the items (context header). */
  header?: ReactNode;
}

/**
 * Menu surface shared by every "เครื่องมือ" affordance — row gear buttons and
 * toolbar dropdowns alike. Dismissal, roving focus and Escape-returns-to-trigger
 * live here so each caller only describes its items.
 */
export function DropdownMenu({
  trigger,
  items,
  ariaLabel,
  align = "end",
  className,
  header,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // Portaled to <body> (see below) so a row menu inside a scroll-clipped
  // table isn't cut off — position is tracked in viewport coordinates.
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    maxWidth: number;
  } | null>(null);

  useDismissable(open, [rootRef, menuRef], (reason) => {
    setOpen(false);
    if (reason === "escape") triggerRef.current?.focus();
  });

  const hasCoordinates = coords !== null;
  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition(): void {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 8;
      const maxWidth = Math.max(0, window.innerWidth - gutter * 2);
      const width = Math.min(menuRef.current?.offsetWidth ?? 160, maxWidth);
      const height = menuRef.current?.scrollHeight ?? 224;
      const below = Math.max(0, window.innerHeight - rect.bottom - gutter * 2);
      const above = Math.max(0, rect.top - gutter * 2);
      const openUp = below < height && above > below;
      const maxHeight = openUp ? above : below;
      const next = {
        top: openUp
          ? rect.top - gutter - Math.min(height, maxHeight)
          : rect.bottom + gutter,
        left: Math.max(
          gutter,
          Math.min(
            align === "end" ? rect.right - width : rect.left,
            window.innerWidth - gutter - width,
          ),
        ),
        maxHeight,
        maxWidth,
      };
      setCoords((current) =>
        current?.top === next.top &&
        current.left === next.left &&
        current.maxHeight === next.maxHeight &&
        current.maxWidth === next.maxWidth
          ? current
          : next,
      );
    }
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const observer = new ResizeObserver(updatePosition);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align, hasCoordinates]);

  function menuItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
  }

  function focusEdge(edge: "first" | "last"): void {
    requestAnimationFrame(() => {
      const elements = menuItems();
      elements[edge === "first" ? 0 : elements.length - 1]?.focus();
    });
  }

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      {trigger({
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
        onClick: () => setOpen((value) => !value),
        onKeyDown: (event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
          focusEdge(event.key === "ArrowDown" ? "first" : "last");
        },
      })}

      {open && coords ? (
        <OverlayPortal>
          <div
            aria-label={ariaLabel}
            // `w-max` sizes the panel to its longest item; the floor is
            // only there so a two-word menu still reads as a menu, not so
            // every menu is wide enough for a sentence.
            className="fixed z-[60] overflow-y-auto w-max min-w-40 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg"
            id={menuId}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                setOpen(false);
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              const elements = menuItems();
              if (elements.length === 0) return;
              if (event.key === "Home" || event.key === "End") {
                elements[
                  event.key === "Home" ? 0 : elements.length - 1
                ]?.focus();
                return;
              }
              const currentIndex = elements.indexOf(
                document.activeElement as HTMLElement,
              );
              const direction = event.key === "ArrowDown" ? 1 : -1;
              elements[
                (currentIndex + direction + elements.length) % elements.length
              ]?.focus();
            }}
            ref={menuRef}
            role="menu"
            style={{
              top: coords.top,
              left: coords.left,
              maxHeight: coords.maxHeight,
              maxWidth: coords.maxWidth,
            }}
          >
            {header ? (
              <>
                <div className="px-3 py-2 text-xs text-slate-500">{header}</div>
                <div className="my-1 border-t border-slate-100" />
              </>
            ) : null}
            {items.map((item) => (
              <button
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
                  item.destructive
                    ? "text-danger hover:bg-danger-100 focus-visible:ring-danger"
                    : "hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-primary",
                )}
                disabled={item.disabled}
                key={item.id}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                role="menuitem"
                type="button"
              >
                {item.icon ? (
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      item.destructive
                        ? "bg-danger-100 text-danger"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null}
                {item.label}
              </button>
            ))}
          </div>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
