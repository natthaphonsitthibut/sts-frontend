import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg transition duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-slate-300 bg-white text-primary-dark hover:border-slate-400 hover:bg-primary-soft",
        secondary:
          "border border-slate-300 bg-white text-primary-dark hover:border-slate-400 hover:bg-primary-soft",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-primary-soft hover:text-primary-dark",
        ghost:
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-primary-soft hover:text-primary-dark",
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends
    Omit<ComponentProps<"button">, "children">,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
  icon: LucideIcon;
  iconClassName?: string;
}

export function IconButton({
  className,
  variant,
  size,
  icon: Icon,
  iconClassName,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(iconButtonVariants({ variant, size }), className)}
      type={type}
      {...props}
    >
      <Icon className={cn("size-4", iconClassName)} aria-hidden="true" />
    </button>
  );
}
