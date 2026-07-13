import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { PAGE_MAX_WIDTH_CLASS } from "./page-primitives";

interface GuestPageShellProps extends ComponentProps<"div"> {
  as?: "div" | "main";
  centered?: boolean;
  contentClassName?: string;
}

export function GuestPageShell({
  as: Root = "div",
  centered = false,
  children,
  className,
  contentClassName,
  ...props
}: GuestPageShellProps) {
  return (
    <Root
      className={cn(
        "min-h-screen bg-slate-50 px-4 py-6 sm:px-6",
        centered && "flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <div className={cn("mx-auto w-full", PAGE_MAX_WIDTH_CLASS)} data-page-container="guest">
        <div className={cn("mx-auto w-full", contentClassName)}>{children}</div>
      </div>
    </Root>
  );
}
