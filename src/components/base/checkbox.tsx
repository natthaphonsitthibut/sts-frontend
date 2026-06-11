import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label?: string;
}

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex items-center gap-3 text-sm font-medium text-slate-700", className)}>
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        <input
          className="peer size-5 appearance-none rounded border border-slate-300 bg-white shadow-sm transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          type="checkbox"
          {...props}
        />
        <Check
          className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
