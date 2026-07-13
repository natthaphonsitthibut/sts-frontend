import type { CSSProperties, ReactNode } from "react";
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

/** Segmented control — the one tab switcher used across the app. */
export function Tabs({
  className,
  onChange,
  options,
  value,
  "aria-label": ariaLabel,
}: TabsProps) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "segmented-tabs relative inline-grid max-w-full rounded-lg bg-primary-soft p-1",
        className,
      )}
      style={
        {
          "--tabs-count": options.length,
          "--tabs-index": activeIndex,
        } as CSSProperties
      }
    >
      <span className="segmented-tabs__indicator pointer-events-none absolute inset-y-1 left-1 rounded-md bg-primary" />
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
              "relative z-10 min-h-10 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              active ? "text-white" : "text-primary-dark/80 hover:bg-white/60 hover:text-primary-dark",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
