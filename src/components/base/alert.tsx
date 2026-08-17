import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const alertVariants = cva("animate-banner-in rounded-lg border p-4 text-sm shadow-sm", {
  variants: {
    variant: {
      default: "border-slate-200 bg-white text-slate-700",
      destructive: "border-danger-200 bg-danger-100 text-danger-700",
      success: "border-success-200 bg-success-100 text-success-700",
      warning: "border-warning-200 bg-warning-100 text-warning-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface AlertProps
  extends ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  /** Renders a close button; the caller decides what closing means. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function Alert({
  children,
  className,
  dismissLabel = "ปิดข้อความนี้",
  onDismiss,
  variant,
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(alertVariants({ variant }), onDismiss && "relative pr-12", className)}
      role="alert"
      {...props}
    >
      {children}
      {onDismiss ? (
        <button
          aria-label={dismissLabel}
          className="absolute right-3 top-3 rounded-md p-1 text-current opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          onClick={onDismiss}
          type="button"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("font-bold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-1 text-sm opacity-90", className)} {...props} />;
}
