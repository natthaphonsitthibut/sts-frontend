import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useSlideIndicator } from "./use-slide-indicator";

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
  const { containerRef, rect, setButtonRef } = useSlideIndicator(value);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      ref={containerRef}
      className={cn(
        "relative inline-flex max-w-full overflow-x-auto overflow-y-hidden border-b border-slate-200",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => setButtonRef(option.value, node)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 shrink-0 px-3 py-2 text-base font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              active
                ? "text-primary"
                : "text-content-primary hover:text-primary-dark",
            )}
          >
            {option.label}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 h-0.5 bg-primary transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
        style={
          rect
            ? { transform: `translateX(${rect.left}px)`, width: rect.width }
            : { width: 0 }
        }
      />
    </div>
  );
}
