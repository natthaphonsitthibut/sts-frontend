import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type LabelProps = ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-bold leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
