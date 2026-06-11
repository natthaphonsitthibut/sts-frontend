import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
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
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props} />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("font-bold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-1 text-sm opacity-90", className)} {...props} />;
}
