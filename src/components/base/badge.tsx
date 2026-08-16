import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-slate-100 text-content-secondary",
        destructive: "bg-danger-100 text-danger",
        success: "bg-success-100 text-success",
        warning: "bg-brand-orange-bg text-brand-orange",
        purple: "bg-brand-purple-bg text-brand-purple",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      data-variant={variant ?? "default"}
    />
  );
}
