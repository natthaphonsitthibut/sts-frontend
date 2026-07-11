import { useEffect, useRef, type ComponentProps } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps extends ComponentProps<"div"> {
  onOpenChange?: (open: boolean) => void;
  open: boolean;
}

export function Dialog({ children, className, onOpenChange, open, ...props }: DialogProps) {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const focusable = regionRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? regionRef.current)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange?.(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = regionRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", className)}
      ref={regionRef}
      {...props}
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/45 animate-overlay-in"
        onClick={() => onOpenChange?.(false)}
        type="button"
      />
      {children}
    </div>
  );
}

export interface DialogContentProps extends ComponentProps<"section"> {
  onClose?: () => void;
}

export function DialogContent({ children, className, onClose, ...props }: DialogContentProps) {
  return (
    <section
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      className={cn(
        "relative z-10 w-full max-w-md rounded-lg border border-slate-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)] animate-dialog-in",
        className,
      )}
      {...props}
    >
      {onClose ? (
        <IconButton
          aria-label="Close dialog"
          className="absolute right-4 top-4 text-slate-500"
          icon={X}
          onClick={onClose}
        />
      ) : null}
      {children}
    </section>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-1.5 pr-10", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-bold text-slate-900", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

export interface DialogFooterProps extends ComponentProps<"div"> {
  align?: "left" | "right" | "between";
}

export function DialogFooter({ align = "right", className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row",
        align === "right" && "sm:justify-end",
        align === "between" && "sm:justify-between",
        align === "left" && "sm:justify-start",
        className,
      )}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-4", className)} {...props} />;
}
