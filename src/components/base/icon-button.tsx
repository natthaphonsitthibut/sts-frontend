import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { iconButtonVariants } from "./icon-button-variants";

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
