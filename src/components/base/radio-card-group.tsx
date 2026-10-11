import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface RadioCardOption<Value extends string> {
  value: Value;
  label: string;
}

export interface RadioCardGroupProps<Value extends string> {
  /** Read by screen readers; the visible heading stays with the caller. */
  legend: string;
  name: string;
  options: ReadonlyArray<RadioCardOption<Value>>;
  value: Value | null;
  onChange: (value: Value) => void;
  className?: string;
}

/**
 * A single choice laid out as cards — the pick-one pattern the report forms
 * use (พบ/ไม่พบนักเรียน, สำเร็จ/ยังไม่สำเร็จ): a native radio for keyboard and
 * screen-reader behaviour, the whole card as its label, a check on the chosen one.
 */
export function RadioCardGroup<Value extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  className,
}: RadioCardGroupProps<Value>) {
  return (
    <fieldset className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 motion-reduce:transition-none",
              selected
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 bg-white text-slate-800 hover:border-primary/50",
            )}
            key={option.value}
          >
            <input
              checked={selected}
              className="size-5 accent-primary"
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="text-sm font-semibold">{option.label}</span>
            {selected ? (
              <Check className="ml-auto size-5" aria-hidden="true" />
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}
