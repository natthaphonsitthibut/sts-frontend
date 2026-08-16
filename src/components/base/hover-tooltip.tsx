import { useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface HoverTooltipProps {
  /** One short sentence — also announced to screen readers on the trigger. */
  label: string;
  children: ReactNode;
  className?: string;
}

interface TooltipAnchor {
  left: number;
  top: number;
}

/**
 * Hover/focus tip for a single short sentence, used where an icon carries
 * meaning that has no room for a caption (a warning glyph beside a status
 * badge). Unlike `InfoTooltip` it needs no click, and unlike a `title`
 * attribute it appears immediately with the app's own styling.
 *
 * The bubble is `fixed` and measured from the trigger because these icons live
 * inside table cells, and a table scrolls in an `overflow-auto` box that would
 * clip an absolutely positioned tip.
 */
export function HoverTooltip({ label, children, className }: HoverTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

  function show(): void {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ left: rect.left + rect.width / 2, top: rect.top });
  }

  return (
    <span
      aria-label={label}
      className={cn(
        "relative inline-flex items-center rounded-sm before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      onBlur={() => setAnchor(null)}
      onFocus={show}
      onMouseEnter={show}
      onMouseLeave={() => setAnchor(null)}
      ref={triggerRef}
      role="note"
      tabIndex={0}
    >
      {children}
      {anchor ? (
        <span
          className="animate-overlay-in pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium leading-relaxed text-slate-700 shadow-lg"
          role="tooltip"
          style={{ left: anchor.left, top: anchor.top - 8 }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
