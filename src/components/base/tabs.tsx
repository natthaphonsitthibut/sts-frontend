import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface TabOption {
  value: string;
  label: ReactNode;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
  className?: string;
  "aria-label"?: string;
}

/** Underline tabs — the one secondary-view switcher used across the app. */
export function Tabs({
  className,
  onChange,
  options,
  value,
  "aria-label": ariaLabel,
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full overflow-x-auto overflow-y-hidden border-b border-slate-200",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "-mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2 text-base font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              active
                ? "border-primary text-primary"
                : "text-content-primary hover:border-slate-300 hover:text-primary-dark",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
