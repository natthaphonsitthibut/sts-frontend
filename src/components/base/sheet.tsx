import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

export interface SheetProps extends ComponentProps<"div"> {
  onOpenChange?: (open: boolean) => void;
  open: boolean;
  position?: "left" | "right";
}

/** Must cover the `sheet-out-left`/`overlay-out` duration in index.css. */
const SHEET_EXIT_DURATION_MS = 200;

export function Sheet({
  children,
  className,
  onOpenChange,
  open,
  position = "left",
  ...props
}: SheetProps) {
  // Closing keeps the sheet mounted just long enough to play the exit
  // animation — unmounting on `open` alone makes it vanish with no motion
  // while opening slides in, which reads as broken. The flag must flip in
  // the same render that sees `open` go false (adjust-state-during-render,
  // same pattern as AttendanceCheckInPage) — an effect fires only after the
  // null render already tore the DOM down, which would flash. With reduced
  // motion the exit classes are inert, so unmount immediately instead of
  // idling out the timeout.
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClosing(true);
    }
  }
  useEffect(() => {
    if (open || !closing) return;
    const timer = window.setTimeout(() => setClosing(false), SHEET_EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, closing]);

  if (!open && !closing) {
    return null;
  }

  return (
    <div aria-hidden={!open || undefined} className="fixed inset-0 z-50 lg:hidden" {...props}>
      <button
        aria-label="Close navigation"
        className={cn(
          "absolute inset-0 bg-slate-950/40",
          open ? "animate-overlay-in" : "animate-overlay-out",
        )}
        onClick={() => onOpenChange?.(false)}
        tabIndex={open ? undefined : -1}
        type="button"
      />
      <aside
        className={cn(
          "absolute top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl",
          open ? "animate-sheet-in-left" : "animate-sheet-out-left",
          position === "left" ? "left-0" : "right-0",
          className,
        )}
      >
        {children}
      </aside>
    </div>
  );
}

export interface SheetHeaderProps extends ComponentProps<"div"> {
  heading: ReactNode;
  onClose?: () => void;
}

export function SheetHeader({
  className,
  heading,
  onClose,
  ...props
}: SheetHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-16 items-center justify-between border-b border-slate-200 px-4",
        className,
      )}
      {...props}
    >
      <div className="text-sm font-semibold text-slate-900">{heading}</div>
      {onClose ? (
        <IconButton aria-label="Close navigation" icon={X} onClick={onClose} />
      ) : null}
    </div>
  );
}

export function SidebarContainer({
  className,
  ...props
}: ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "hidden h-full w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col",
        className,
      )}
      {...props}
    />
  );
}
