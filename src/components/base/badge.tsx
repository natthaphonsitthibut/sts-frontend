import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-slate-100 text-slate-700",
        destructive: "bg-danger-100 text-danger-700",
        success: "bg-success-100 text-success-700",
        warning: "bg-warning-100 text-warning-700",
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
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
