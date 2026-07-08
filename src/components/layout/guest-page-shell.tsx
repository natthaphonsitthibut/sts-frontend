import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

interface GuestPageShellProps extends ComponentProps<"div"> {
  centered?: boolean;
  contentClassName?: string;
  maxWidthClassName?: string;
}

export function GuestPageShell({
  centered = false,
  children,
  className,
  contentClassName,
  maxWidthClassName = "max-w-[960px]",
  ...props
}: GuestPageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-slate-100 p-6",
        centered && "flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <div
        className={cn("mx-auto w-full", maxWidthClassName, contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
