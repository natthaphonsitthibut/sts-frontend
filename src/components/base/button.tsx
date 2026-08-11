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
  iconClassName?: string;
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
  iconClassName,
  isLoading,
  loadingIconMotion = "spin",
  loadingText,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  // Only buttons that declare a loading state reserve room for it — a plain
  // button must not grow to fit a spinner it will never show.
  const loadable = isLoading !== undefined || loadingText !== undefined;
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      data-slot="button"
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {/* Both states are always laid out in one grid cell so the button keeps
          the width of the wider one — swapping to the spinner/loading label
          must not change the button's size and shove its neighbours around. */}
      <span className="grid place-items-center">
        <span
          aria-hidden={isLoading}
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap",
            isLoading && "invisible",
          )}
        >
          {Icon ? <Icon className={cn("size-4", iconClassName)} aria-hidden="true" /> : null}
          {children}
        </span>
        {loadable ? (
          <span
            aria-hidden={!isLoading}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap",
              !isLoading && "invisible",
            )}
          >
            {/* One spin motion system-wide: refresh keeps its own icon, the rest
                show the loader — both rotate with the same `animate-spin`. */}
            {Icon && loadingIconMotion === "refresh" ? (
              <Icon
                className={cn("size-4", isLoading && "animate-spin", iconClassName)}
                aria-hidden="true"
              />
            ) : (
              <LoaderCircle
                className={cn("size-4", isLoading && "animate-spin")}
                aria-hidden="true"
              />
            )}
            {loadingText ?? children}
          </span>
        ) : null}
      </span>
    </button>
  );
}
