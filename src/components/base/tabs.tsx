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
        "segmented-tabs relative inline-grid rounded-lg bg-slate-100 p-1",
        className,
      )}
      style={
        {
          "--tabs-count": options.length,
          "--tabs-index": activeIndex,
        } as CSSProperties
      }
    >
      <span className="segmented-tabs__indicator pointer-events-none absolute inset-y-1 left-1 rounded-md bg-primary shadow-sm" />
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
              "relative z-10 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none",
              active ? "text-white" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
