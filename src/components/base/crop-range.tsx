export interface CropRangeProps {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel?: string;
  disabled?: boolean;
}

/** Labelled slider shared by every image framing control (cover art, avatars). */
export function CropRange({
  disabled,
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
  valueLabel,
}: CropRangeProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="tabular-nums text-slate-500">
          {valueLabel ?? `${value}%`}
        </span>
      </span>
      <input
        className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}
