import { useEffect, useRef, type ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps extends ComponentProps<"div"> {
  onOpenChange?: (open: boolean) => void;
  open: boolean;
}

export function Dialog({
  children,
  className,
  onOpenChange,
  open,
  ...props
}: DialogProps) {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const focusable =
        regionRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? regionRef.current)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChangeRef.current?.(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable =
        regionRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
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
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className,
      )}
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

export function DialogContent({
  children,
  className,
  onClose,
  ...props
}: DialogContentProps) {
  return (
    <section
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      className={cn(
        "relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-dialog-in",
        className,
      )}
      {...props}
    >
      {onClose ? (
        <IconButton
          aria-label="Close dialog"
          className="absolute right-3 top-3 z-20 size-8 border-transparent bg-transparent text-slate-500 shadow-none hover:border-transparent hover:bg-slate-100 hover:text-slate-900"
          icon={X}
          onClick={onClose}
        />
      ) : null}
      {children}
    </section>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-mx-6 -mt-6 mb-5 min-h-14 space-y-1 border-b border-slate-200 px-6 py-4 pr-14",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogTitleProps extends ComponentProps<"h2"> {
  icon?: LucideIcon;
}

export function DialogTitle({
  children,
  className,
  icon: Icon,
  ...props
}: DialogTitleProps) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2 text-base font-bold text-slate-900",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </h2>
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

export interface DialogFooterProps extends ComponentProps<"div"> {
  align?: "left" | "right" | "between";
}

export function DialogFooter({
  align = "right",
  className,
  ...props
}: DialogFooterProps) {
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
