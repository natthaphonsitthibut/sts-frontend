import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { PAGE_MAX_WIDTH_CLASS } from "./page-primitives";

interface GuestPageShellProps extends ComponentProps<"div"> {
  as?: "div" | "main";
  centered?: boolean;
  containerClassName?: string;
  contentClassName?: string;
}

export function GuestPageShell({
  as: Root = "div",
  centered = false,
  children,
  className,
  containerClassName,
  contentClassName,
  ...props
}: GuestPageShellProps) {
  return (
    <Root
      className={cn(
        "min-h-screen bg-surface-page px-4 py-6 sm:px-6",
        centered && "flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <div
        className={cn("mx-auto w-full", PAGE_MAX_WIDTH_CLASS, containerClassName)}
        data-page-container="guest"
      >
        <div className={cn("mx-auto w-full", contentClassName)}>{children}</div>
      </div>
    </Root>
  );
}
