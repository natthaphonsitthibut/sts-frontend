import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button-variants";

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  icon?: LucideIcon;
  isLoading?: boolean;
  loadingIconMotion?: "spin" | "refresh";
  loadingText?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  icon: Icon,
  isLoading = false,
  loadingIconMotion = "spin",
  loadingText,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? (
        // One spin motion system-wide: refresh keeps its own icon, login/default
        // shows the loader — both rotate with the same `animate-spin` timing.
        Icon && loadingIconMotion === "refresh" ? (
          <Icon className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        )
      ) : Icon ? (
        <Icon className="size-4" aria-hidden="true" />
      ) : null}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
