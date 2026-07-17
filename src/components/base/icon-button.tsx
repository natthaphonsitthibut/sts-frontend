import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg transition duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-sm hover:bg-primary-dark",
        secondary: "bg-primary-soft text-primary-dark hover:bg-primary/15",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary-soft hover:text-primary-dark",
        ghost:
          "border border-transparent bg-primary-soft text-primary-dark hover:bg-primary/15",
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
  extends Omit<ComponentProps<"button">, "children">,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
  icon: LucideIcon;
}

export function IconButton({
  className,
  variant,
  size,
  icon: Icon,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(iconButtonVariants({ variant, size }), className)}
      type={type}
      {...props}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
