import { Info } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";

export interface InfoTooltipProps {
  /** Announced to screen readers as "ข้อมูลเพิ่มเติม: {label}". */
  label: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
}

/**
 * Click-to-reveal info popover for the one or two genuinely non-obvious
 * decisions per page (anomaly types, scope/permission editors). Not a hover
 * tooltip — the content is often a full explanation, so it needs to stay open
 * long enough to read and work on touch devices.
 */
export function InfoTooltip({
  align = "center",
  label,
  children,
  className,
  contentClassName,
  triggerClassName,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useDismissable(open, containerRef, () => setOpen(false));

  return (
    <div className={cn("relative inline-flex", className)} ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={`ข้อมูลเพิ่มเติม: ${label}`}
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className={cn(
            "animate-banner-in absolute top-full z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
            contentClassName,
          )}
          role="note"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
