import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export interface LabelProps extends ComponentProps<"label"> {
  /** Mark the field as required — one shared red-asterisk pattern app-wide. */
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-bold leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </label>
  );
}
