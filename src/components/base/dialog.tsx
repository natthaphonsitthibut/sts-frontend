import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { OverlayScopeContext, useOwnedOverlayIds } from "./overlay-scope";
import { IconButton } from "./icon-button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const [overlayContainer, setOverlayContainer] =
    useState<HTMLDivElement | null>(null);
  const [overlayIds, setOverlayIds] = useState<string[]>([]);
  const setRegionRef = useCallback((node: HTMLDivElement | null) => {
    regionRef.current = node;
    setOverlayContainer(node);
  }, []);
  const registerOverlay = useCallback((id: string) => {
    setOverlayIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    return () => setOverlayIds((ids) => ids.filter((value) => value !== id));
  }, []);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    function ownsFocus(): boolean {
      const roots = Array.from(
        document.querySelectorAll<HTMLElement>("[data-dialog-root]"),
      );
      const top = roots.reduce<HTMLElement | null>((current, next) => {
        if (!current || current.contains(next)) return next;
        if (next.contains(current)) return current;
        return (Number(getComputedStyle(next).zIndex) || 0) >=
          (Number(getComputedStyle(current).zIndex) || 0)
          ? next
          : current;
      }, null);
      return top === regionRef.current;
    }

    function focusFirst() {
      if (!ownsFocus()) return;
      const content = regionRef.current?.querySelector<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      );
      const focusable = content?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? content ?? regionRef.current)?.focus();
    }
    const focusTimer = window.setTimeout(focusFirst, 0);

    function handleFocusIn(event: FocusEvent) {
      if (!ownsFocus()) return;
      if (!regionRef.current?.contains(event.target as Node)) focusFirst();
    }

    function handleKeyDown(event: KeyboardEvent) {
      // A portalled child dialog belongs to this region, but owns the keyboard
      // until it closes. Escape must not dismiss both levels at once.
      if (event.defaultPrevented || !ownsFocus()) return;
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
      if (!regionRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      window.clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <OverlayScopeContext
      value={{
        container: overlayContainer,
        ids: overlayIds,
        register: registerOverlay,
      }}
    >
      <div
        data-dialog-root
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          className,
        )}
        ref={setRegionRef}
        {...props}
      >
        <button
          aria-label="Close dialog"
          className="absolute inset-0 bg-slate-950/45 animate-overlay-in"
          onClick={() => onOpenChange?.(false)}
          tabIndex={-1}
          type="button"
        />
        {children}
      </div>
    </OverlayScopeContext>
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
  const overlayIds = useOwnedOverlayIds();
  return (
    <section
      aria-modal="true"
      aria-owns={overlayIds.length > 0 ? overlayIds.join(" ") : undefined}
      role="dialog"
      tabIndex={-1}
      className={cn(
        // Capped to the viewport and scrolled inside: a tall form (e.g. the
        // teacher-comment dialog on a laptop screen) otherwise ran off both
        // edges with its save button out of reach.
        "relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-dialog-in",
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
  iconClassName?: string;
}

export function DialogTitle({
  children,
  className,
  icon: Icon,
  iconClassName,
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
      {Icon ? (
        <Icon
          className={cn("size-4 shrink-0", iconClassName)}
          aria-hidden="true"
        />
      ) : null}
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
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:[&>button]:min-w-24",
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
